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
  const { httpMethod, path } = event;
  const endpoint = path.replace('/api/backup/', '');

  if (httpMethod === 'GET' && endpoint === 'export') {
    return await handleExport(userId);
  }

  if (httpMethod === 'POST' && endpoint === 'import') {
    return await handleImport(userId, event);
  }

  return errorResponse('方法不支持', 405);
};

async function handleExport(userId) {
  try {
    const db = await getDB();
    
    const result = db.exec(`SELECT l.id as ledger_id, l.name as ledger_name, l.description as ledger_description, t.* FROM transactions t JOIN ledgers l ON t.ledger_id = l.id WHERE l.user_id = ${userId}`);
    
    const ledgers = {};
    const transactions = [];
    
    if (result.length > 0 && result[0].values.length > 0) {
      result[0].values.forEach(row => {
        const ledgerId = row[0];
        if (!ledgers[ledgerId]) {
          ledgers[ledgerId] = {
            id: ledgerId,
            name: row[1],
            description: row[2]
          };
        }
        transactions.push({
          id: row[3],
          ledgerId: ledgerId,
          type: row[4],
          category: row[5],
          amount: row[6],
          remark: row[7],
          date: row[8],
          time: row[9],
          createdAt: row[11],
          updatedAt: row[12]
        });
      });
    }

    const backupData = {
      exportTime: new Date().toISOString(),
      userId,
      ledgers: Object.values(ledgers),
      transactions
    };

    return successResponse({ data: backupData });
  } catch (err) {
    return errorResponse('导出数据失败: ' + err.message, 500);
  }
}

async function handleImport(userId, event) {
  try {
    const { ledgers, transactions } = JSON.parse(event.body);
    
    if (!ledgers || !Array.isArray(ledgers) || !transactions || !Array.isArray(transactions)) {
      return errorResponse('无效的数据格式');
    }

    const db = await getDB();
    const ledgerMap = {};
    let successCount = 0;
    let skipCount = 0;

    for (const ledger of ledgers) {
      try {
        db.run(`INSERT OR IGNORE INTO ledgers (user_id, name, description) VALUES (${userId}, '${ledger.name}', '${ledger.description || ''}')`);
        
        const result = db.exec(`SELECT id FROM ledgers WHERE user_id = ${userId} AND name = '${ledger.name}'`);
        if (result.length > 0 && result[0].values.length > 0) {
          ledgerMap[ledger.id] = result[0].values[0][0];
        }
      } catch (err) {
        skipCount++;
      }
    }

    for (const trans of transactions) {
      try {
        const actualLedgerId = ledgerMap[trans.ledgerId] || trans.ledgerId;
        
        db.run(`INSERT OR IGNORE INTO transactions (ledger_id, type, category, amount, remark, date, time) VALUES (${actualLedgerId}, '${trans.type}', '${trans.category}', ${trans.amount}, '${trans.remark || ''}', '${trans.date}', ${trans.time})`);
        
        const changes = db.exec('SELECT changes() AS count')[0].values[0][0];
        if (changes > 0) {
          successCount++;
        } else {
          skipCount++;
        }
      } catch (err) {
        skipCount++;
      }
    }

    return successResponse({
      message: `导入完成: 成功 ${successCount}, 跳过 ${skipCount}`,
      stats: { success: successCount, skip: skipCount }
    });
  } catch (err) {
    return errorResponse('导入数据失败: ' + err.message, 500);
  }
}