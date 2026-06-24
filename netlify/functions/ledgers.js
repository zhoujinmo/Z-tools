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
  const pathParts = path.split('/');
  const ledgerId = pathParts[pathParts.length - 1];

  if (httpMethod === 'GET' && !isNaN(ledgerId)) {
    return await handleGetLedger(userId, parseInt(ledgerId));
  }

  if (httpMethod === 'GET') {
    return await handleListLedgers(userId);
  }

  if (httpMethod === 'POST') {
    return await handleCreateLedger(userId, event);
  }

  if (httpMethod === 'PUT' && !isNaN(ledgerId)) {
    return await handleUpdateLedger(userId, parseInt(ledgerId), event);
  }

  if (httpMethod === 'DELETE' && !isNaN(ledgerId)) {
    return await handleDeleteLedger(userId, parseInt(ledgerId));
  }

  return errorResponse('方法不支持', 405);
};

async function handleListLedgers(userId) {
  try {
    const db = await getDB();
    const result = db.exec(`SELECT id, name, description, created_at FROM ledgers WHERE user_id = ${userId}`);
    
    const ledgers = [];
    if (result.length > 0 && result[0].values.length > 0) {
      result[0].values.forEach(row => {
        ledgers.push({
          id: row[0],
          name: row[1],
          description: row[2],
          created_at: row[3]
        });
      });
    }

    return successResponse({ data: ledgers });
  } catch (err) {
    return errorResponse('获取账本列表失败: ' + err.message, 500);
  }
}

async function handleGetLedger(userId, ledgerId) {
  try {
    const db = await getDB();
    const result = db.exec(`SELECT id, name, description, created_at FROM ledgers WHERE id = ${ledgerId} AND user_id = ${userId}`);
    
    if (result.length === 0 || result[0].values.length === 0) {
      return errorResponse('账本不存在', 404);
    }

    const row = result[0].values[0];
    const ledger = {
      id: row[0],
      name: row[1],
      description: row[2],
      created_at: row[3]
    };

    return successResponse({ data: ledger });
  } catch (err) {
    return errorResponse('获取账本失败: ' + err.message, 500);
  }
}

async function handleCreateLedger(userId, event) {
  try {
    const { name, description } = JSON.parse(event.body);

    if (!name) {
      return errorResponse('账本名称不能为空');
    }

    const db = await getDB();
    
    try {
      db.run(`INSERT INTO ledgers (user_id, name, description) VALUES (${userId}, '${name}', '${description || ''}')`);
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return errorResponse('账本名称已存在');
      }
      throw err;
    }

    const ledgerId = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0];

    return successResponse({
      data: { id: ledgerId, name, description }
    }, '账本创建成功');
  } catch (err) {
    return errorResponse('创建账本失败: ' + err.message, 500);
  }
}

async function handleUpdateLedger(userId, ledgerId, event) {
  try {
    const { name, description } = JSON.parse(event.body);

    if (!name) {
      return errorResponse('账本名称不能为空');
    }

    const db = await getDB();
    
    const exists = db.exec(`SELECT id FROM ledgers WHERE id = ${ledgerId} AND user_id = ${userId}`);
    if (exists.length === 0 || exists[0].values.length === 0) {
      return errorResponse('账本不存在', 404);
    }

    try {
      db.run(`UPDATE ledgers SET name = '${name}', description = '${description || ''}', updated_at = CURRENT_TIMESTAMP WHERE id = ${ledgerId}`);
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return errorResponse('账本名称已存在');
      }
      throw err;
    }

    return successResponse({}, '账本更新成功');
  } catch (err) {
    return errorResponse('更新账本失败: ' + err.message, 500);
  }
}

async function handleDeleteLedger(userId, ledgerId) {
  try {
    const db = await getDB();
    
    db.run(`DELETE FROM ledgers WHERE id = ${ledgerId} AND user_id = ${userId}`);
    
    const changes = db.exec('SELECT changes() AS count')[0].values[0][0];
    if (changes === 0) {
      return errorResponse('账本不存在', 404);
    }

    return successResponse({}, '账本删除成功');
  } catch (err) {
    return errorResponse('删除账本失败: ' + err.message, 500);
  }
}