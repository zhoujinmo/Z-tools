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
  const endpoint = path.replace('/api/sync/', '');

  if (httpMethod === 'GET' && endpoint === 'status') {
    return await handleGetStatus(userId);
  }

  if (httpMethod === 'POST' && endpoint === 'pull') {
    return await handlePull(userId, event);
  }

  if (httpMethod === 'POST' && endpoint === 'push') {
    return await handlePush(userId, event);
  }

  if (httpMethod === 'POST' && endpoint === 'full-sync') {
    return await handleFullSync(userId);
  }

  return errorResponse('方法不支持', 405);
};

async function handleGetStatus(userId) {
  try {
    const db = await getDB();
    const result = db.exec(`SELECT last_sync_time, sync_token FROM sync_records WHERE user_id = ${userId}`);
    
    let lastSyncTime = null;
    let syncToken = null;
    
    if (result.length > 0 && result[0].values.length > 0) {
      lastSyncTime = result[0].values[0][0];
      syncToken = result[0].values[0][1];
    }

    return successResponse({ data: { lastSyncTime, syncToken } });
  } catch (err) {
    return errorResponse('获取同步状态失败: ' + err.message, 500);
  }
}

async function handlePull(userId, event) {
  try {
    const { lastSyncTime, ledgerId } = JSON.parse(event.body);
    const db = await getDB();

    let query = `SELECT t.* FROM transactions t JOIN ledgers l ON t.ledger_id = l.id WHERE l.user_id = ${userId}`;
    
    if (ledgerId) {
      query += ` AND t.ledger_id = ${ledgerId}`;
    }

    if (lastSyncTime) {
      query += ` AND t.updated_at > '${lastSyncTime}'`;
    }

    const result = db.exec(query);
    
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

    db.run(`INSERT OR REPLACE INTO sync_records (user_id, last_sync_time) VALUES (${userId}, CURRENT_TIMESTAMP)`);

    const syncTime = new Date().toISOString();
    return successResponse({ data: transactions, syncTime });
  } catch (err) {
    return errorResponse('拉取数据失败: ' + err.message, 500);
  }
}

async function handlePush(userId, event) {
  try {
    const { transactions } = JSON.parse(event.body);
    
    if (!transactions || !Array.isArray(transactions)) {
      return errorResponse('无效的数据格式');
    }

    const db = await getDB();
    let successCount = 0;
    let errorCount = 0;

    for (const item of transactions) {
      try {
        const ledgerExists = db.exec(`SELECT id FROM ledgers WHERE id = ${item.ledgerId} AND user_id = ${userId}`);
        if (ledgerExists.length === 0 || ledgerExists[0].values.length === 0) {
          errorCount++;
          continue;
        }

        const existing = db.exec(`SELECT id FROM transactions WHERE ledger_id = ${item.ledgerId} AND date = '${item.date}' AND time = ${item.time}`);
        
        if (existing.length > 0 && existing[0].values.length > 0) {
          const existingId = existing[0].values[0][0];
          db.run(`UPDATE transactions SET type = '${item.type}', category = '${item.category}', amount = ${item.amount}, remark = '${item.remark || ''}', sync_status = 'synced', updated_at = CURRENT_TIMESTAMP WHERE id = ${existingId}`);
        } else {
          db.run(`INSERT INTO transactions (ledger_id, type, category, amount, remark, date, time, sync_status) VALUES (${item.ledgerId}, '${item.type}', '${item.category}', ${item.amount}, '${item.remark || ''}', '${item.date}', ${item.time}, 'synced')`);
        }
        successCount++;
      } catch (err) {
        errorCount++;
      }
    }

    db.run(`INSERT OR REPLACE INTO sync_records (user_id, last_sync_time) VALUES (${userId}, CURRENT_TIMESTAMP)`);

    const syncTime = new Date().toISOString();
    return successResponse({
      message: `同步完成: 成功 ${successCount}, 失败 ${errorCount}`,
      stats: { success: successCount, error: errorCount },
      syncTime
    });
  } catch (err) {
    return errorResponse('推送数据失败: ' + err.message, 500);
  }
}

async function handleFullSync(userId) {
  try {
    const db = await getDB();
    
    const result = db.exec(`SELECT l.id as ledger_id, l.name as ledger_name, t.* FROM transactions t JOIN ledgers l ON t.ledger_id = l.id WHERE l.user_id = ${userId}`);
    
    const ledgers = {};
    const transactions = [];
    
    if (result.length > 0 && result[0].values.length > 0) {
      result[0].values.forEach(row => {
        const ledgerId = row[0];
        if (!ledgers[ledgerId]) {
          ledgers[ledgerId] = { id: ledgerId, name: row[1] };
        }
        transactions.push({
          id: row[2],
          ledgerId: ledgerId,
          type: row[3],
          category: row[4],
          amount: row[5],
          remark: row[6],
          date: row[7],
          time: row[8],
          syncStatus: row[9],
          createdAt: row[10],
          updatedAt: row[11]
        });
      });
    }

    db.run(`INSERT OR REPLACE INTO sync_records (user_id, last_sync_time) VALUES (${userId}, CURRENT_TIMESTAMP)`);

    const syncTime = new Date().toISOString();
    return successResponse({
      data: {
        ledgers: Object.values(ledgers),
        transactions
      },
      syncTime
    });
  } catch (err) {
    return errorResponse('获取完整数据失败: ' + err.message, 500);
  }
}