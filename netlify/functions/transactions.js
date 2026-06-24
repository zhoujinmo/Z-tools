const { getLedgerById, createTransaction, getTransactionsByLedger, updateTransaction, deleteTransaction, getTransactionStats } = require('./utils/db');
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
      return handleGetStats(userId, ledgerId, queryStringParameters);
    }
    
    if (httpMethod === 'GET') {
      return handleGetByLedger(userId, ledgerId, queryStringParameters);
    }
  }

  const transactionId = pathParts[pathParts.length - 1];

  if (httpMethod === 'POST') {
    return handleCreate(userId, event);
  }

  if (httpMethod === 'PUT' && !isNaN(transactionId)) {
    return handleUpdate(userId, parseInt(transactionId), event);
  }

  if (httpMethod === 'DELETE' && !isNaN(transactionId)) {
    return handleDelete(userId, parseInt(transactionId));
  }

  return errorResponse('方法不支持', 405);
};

function handleGetByLedger(userId, ledgerId, query) {
  try {
    const ledger = getLedgerById(ledgerId);
    
    if (!ledger || ledger.user_id !== userId) {
      return errorResponse('账本不存在', 404);
    }

    const transactions = getTransactionsByLedger(ledgerId, query?.month);

    return successResponse({ data: transactions });
  } catch (err) {
    return errorResponse('获取交易记录失败: ' + err.message, 500);
  }
}

function handleGetStats(userId, ledgerId, query) {
  try {
    const ledger = getLedgerById(ledgerId);
    
    if (!ledger || ledger.user_id !== userId) {
      return errorResponse('账本不存在', 404);
    }

    const stats = getTransactionStats(ledgerId, query?.month);

    return successResponse({ data: stats });
  } catch (err) {
    return errorResponse('获取统计数据失败: ' + err.message, 500);
  }
}

function handleCreate(userId, event) {
  try {
    const { ledgerId, type, category, amount, remark, date, time } = JSON.parse(event.body);

    if (!ledgerId || !type || !category || !amount || !date || !time) {
      return errorResponse('缺少必要参数');
    }

    const ledger = getLedgerById(ledgerId);
    
    if (!ledger || ledger.user_id !== userId) {
      return errorResponse('账本不存在', 404);
    }

    const transaction = createTransaction(ledgerId, type, category, amount, remark, date, time);

    return successResponse({
      data: { id: transaction.id }
    }, '交易记录创建成功');
  } catch (err) {
    return errorResponse('创建交易记录失败: ' + err.message, 500);
  }
}

function handleUpdate(userId, transactionId, event) {
  try {
    const { type, category, amount, remark, date, time } = JSON.parse(event.body);

    updateTransaction(transactionId, type, category, amount, remark, date, time);

    return successResponse({}, '交易记录更新成功');
  } catch (err) {
    return errorResponse('更新交易记录失败: ' + err.message, 500);
  }
}

function handleDelete(userId, transactionId) {
  try {
    const success = deleteTransaction(transactionId);
    
    if (!success) {
      return errorResponse('交易记录不存在', 404);
    }

    return successResponse({}, '交易记录删除成功');
  } catch (err) {
    return errorResponse('删除交易记录失败: ' + err.message, 500);
  }
}