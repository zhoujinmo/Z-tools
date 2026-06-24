const { getDB } = require('./utils/db');
const { authenticate } = require('./utils/auth');

function successResponse(data, message = '操作成功') {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, message, ...data })
  };
}

function errorResponse(message, statusCode = 400) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: false, message })
  };
}

exports.handler = async (event) => {
  const authResult = await authenticate(event);
  if (!authResult.success) {
    return errorResponse(authResult.error, 401);
  }

  const userId = authResult.user.userId;
  const { httpMethod, path, queryStringParameters } = event;
  const pathParts = path.split('/');
  
  if (path.includes('/ledger/')) {
    const ledgerIdx = pathParts.indexOf('ledger');
    const ledgerId = parseInt(pathParts[ledgerIdx + 1]);
    
    if (httpMethod === 'GET' && path.includes('/stats')) {
      return await handleGetStats(userId, ledgerId, queryStringParameters);
    }
    
    if (httpMethod === 'GET') {
      return await handleGetByLedger(userId, ledgerId, queryStringParameters);
    }
  }

  const transactionId = pathParts[pathParts.length - 1];

  if (httpMethod === 'POST') {
    return await handleCreate(userId, event);
  }

  if (httpMethod === 'PUT' && !isNaN(transactionId)) {
    return await handleUpdate(userId, parseInt(transactionId), event);
  }

  if (httpMethod === 'DELETE' && !isNaN(transactionId)) {
    return await handleDelete(userId, parseInt(transactionId));
  }

  return errorResponse('方法不支持', 405);
};

async function handleGetByLedger(userId, ledgerId, query) {
  try {
    const db = await getDB();
    
    const ledgerExists = db.exec(`SELECT id FROM ledgers WHERE id = ${ledgerId} AND user_id = ${userId}`);
    if (ledgerExists.length === 0 || ledgerExists[0].values.length === 0) {
      return errorResponse('账本不存在', 404);
    }

    let querySql = `SELECT t.* FROM transactions t JOIN ledgers l ON t.ledger_id = l.id WHERE l.user_id = ${userId} AND t.ledger_id = ${ledgerId}`;
    
    if (query && query.month) {
      querySql += ` AND t.date LIKE '${query.month}%'`;
    }
    
    querySql += ' ORDER BY t.date DESC, t.time DESC';
    
    const result = db.exec(querySql);
    
    const transactions = [];
    if (result.length > 0 && result[0].values.length > 0) {
      result[0].values.forEach(row => {
        transactions.push({
          id: row[0],
          ledger_id: row[1],
          type: row[2],
          category: row[3],
          amount: row[4],
          remark: row[5],
          date: row[6],
          time: row[7],
          sync_status: row[8],
          created_at: row[9],
          updated_at: row[10]
        });
      });
    }

    return successResponse({ data: transactions });
  } catch (err) {
    return errorResponse('获取交易记录失败: ' + err.message, 500);
  }
}

async function handleGetStats(userId, ledgerId, query) {
  try {
    const db = await getDB();
    
    const ledgerExists = db.exec(`SELECT id FROM ledgers WHERE id = ${ledgerId} AND user_id = ${userId}`);
    if (ledgerExists.length === 0 || ledgerExists[0].values.length === 0) {
      return errorResponse('账本不存在', 404);
    }

    let querySql = `SELECT t.type, SUM(t.amount) as total FROM transactions t JOIN ledgers l ON t.ledger_id = l.id WHERE l.user_id = ${userId} AND t.ledger_id = ${ledgerId}`;
    
    if (query && query.month) {
      querySql += ` AND t.date LIKE '${query.month}%'`;
    }
    
    querySql += ' GROUP BY t.type';
    
    const result = db.exec(querySql);
    
    const stats = { income: 0, expense: 0 };
    if (result.length > 0 && result[0].values.length > 0) {
      result[0].values.forEach(row => {
        stats[row[0]] = parseFloat(row[1]) || 0;
      });
    }

    return successResponse({ data: stats });
  } catch (err) {
    return errorResponse('获取统计数据失败: ' + err.message, 500);
  }
}

async function handleCreate(userId, event) {
  try {
    const { ledgerId, type, category, amount, remark, date, time } = JSON.parse(event.body);

    if (!ledgerId || !type || !category || !amount || !date || !time) {
      return errorResponse('缺少必要参数');
    }

    const db = await getDB();
    
    const ledgerExists = db.exec(`SELECT id FROM ledgers WHERE id = ${ledgerId} AND user_id = ${userId}`);
    if (ledgerExists.length === 0 || ledgerExists[0].values.length === 0) {
      return errorResponse('账本不存在', 404);
    }

    db.run(`INSERT INTO transactions (ledger_id, type, category, amount, remark, date, time) VALUES (${ledgerId}, '${type}', '${category}', ${amount}, '${remark || ''}', '${date}', ${time})`);
    
    const transactionId = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0];

    return successResponse({
      data: { id: transactionId }
    }, '交易记录创建成功');
  } catch (err) {
    return errorResponse('创建交易记录失败: ' + err.message, 500);
  }
}

async function handleUpdate(userId, transactionId, event) {
  try {
    const { type, category, amount, remark, date, time } = JSON.parse(event.body);

    const db = await getDB();
    
    const result = db.exec(`SELECT t.* FROM transactions t JOIN ledgers l ON t.ledger_id = l.id WHERE t.id = ${transactionId} AND l.user_id = ${userId}`);
    
    if (result.length === 0 || result[0].values.length === 0) {
      return errorResponse('交易记录不存在', 404);
    }

    db.run(`UPDATE transactions SET type = '${type}', category = '${category}', amount = ${amount}, remark = '${remark || ''}', date = '${date}', time = ${time}, updated_at = CURRENT_TIMESTAMP WHERE id = ${transactionId}`);

    return successResponse({}, '交易记录更新成功');
  } catch (err) {
    return errorResponse('更新交易记录失败: ' + err.message, 500);
  }
}

async function handleDelete(userId, transactionId) {
  try {
    const db = await getDB();
    
    db.run(`DELETE FROM transactions t WHERE t.id = ${transactionId} AND EXISTS (SELECT 1 FROM ledgers l WHERE l.id = t.ledger_id AND l.user_id = ${userId})`);
    
    const changes = db.exec('SELECT changes() AS count')[0].values[0][0];
    if (changes === 0) {
      return errorResponse('交易记录不存在', 404);
    }

    return successResponse({}, '交易记录删除成功');
  } catch (err) {
    return errorResponse('删除交易记录失败: ' + err.message, 500);
  }
}