const { getLedgerById, getTransactionsByLedger, createTransaction, updateTransaction, getSyncRecord, upsertSyncRecord, getAllUserTransactions, getLedgersByUserId } = require('./utils/db');
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
    const syncRecord = getSyncRecord(userId);
    
    return successResponse({ 
      data: { 
        lastSyncTime: syncRecord?.last_sync_time || null, 
        syncToken: syncRecord?.sync_token || null 
      } 
    });
  } catch (err) {
    return errorResponse('获取同步状态失败: ' + err.message, 500);
  }
}

async function handlePull(userId, event) {
  try {
    const { lastSyncTime, ledgerId } = JSON.parse(event.body);
    
    let transactions = [];
    if (ledgerId) {
      transactions = getTransactionsByLedger(ledgerId);
    } else {
      transactions = getAllUserTransactions(userId);
    }

    if (lastSyncTime) {
      transactions = transactions.filter(t => t.updated_at > lastSyncTime);
    }

    const syncTime = new Date().toISOString();
    upsertSyncRecord(userId, syncTime);

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

    let successCount = 0;
    let errorCount = 0;

    for (const item of transactions) {
      try {
        const ledger = getLedgerById(item.ledgerId);
        if (!ledger || ledger.user_id !== userId) {
          errorCount++;
          continue;
        }

        const existing = getTransactionsByLedger(item.ledgerId).find(t => t.date === item.date && t.time === item.time);
        
        if (existing) {
          updateTransaction(existing.id, item.type, item.category, item.amount, item.remark, item.date, item.time);
        } else {
          createTransaction(item.ledgerId, item.type, item.category, item.amount, item.remark, item.date, item.time);
        }
        successCount++;
      } catch (err) {
        errorCount++;
      }
    }

    const syncTime = new Date().toISOString();
    upsertSyncRecord(userId, syncTime);

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
    const ledgers = getLedgersByUserId(userId);
    const transactions = getAllUserTransactions(userId);

    const syncTime = new Date().toISOString();
    upsertSyncRecord(userId, syncTime);

    return successResponse({
      data: {
        ledgers,
        transactions
      },
      syncTime
    });
  } catch (err) {
    return errorResponse('获取完整数据失败: ' + err.message, 500);
  }
}