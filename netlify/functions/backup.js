const { getLedgersByUserId, getAllUserTransactions, createLedger, createTransaction } = require('./utils/db');
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
    const ledgers = await getLedgersByUserId(userId);
    const transactions = await getAllUserTransactions(userId);

    const backupData = {
      exportTime: new Date().toISOString(),
      userId,
      ledgers,
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

    const ledgerMap = {};
    let successCount = 0;
    let skipCount = 0;

    for (const ledger of ledgers) {
      try {
        const existing = await getLedgersByUserId(userId);
        const found = existing.find(l => l.name === ledger.name);
        if (found) {
          ledgerMap[ledger.id] = found.id;
          skipCount++;
        } else {
          const newLedger = await createLedger(userId, ledger.name, ledger.description);
          ledgerMap[ledger.id] = newLedger.id;
          successCount++;
        }
      } catch (err) {
        skipCount++;
      }
    }

    for (const trans of transactions) {
      try {
        const actualLedgerId = ledgerMap[trans.ledgerId] || trans.ledgerId;
        
        const existing = await getAllUserTransactions(userId);
        const found = existing.find(t => t.date === trans.date && t.time === trans.time);
        if (found) {
          skipCount++;
        } else {
          await createTransaction(actualLedgerId, trans.type, trans.category, trans.amount, trans.remark, trans.date, trans.time);
          successCount++;
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