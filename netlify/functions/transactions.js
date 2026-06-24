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
  try {
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
        const ledger = await getLedgerById(ledgerId);
        if (!ledger || ledger.user_id !== userId) {
          return errorResponse('账本不存在', 404);
        }
        const stats = await getTransactionStats(ledgerId, queryStringParameters?.month);
        return successResponse({ data: stats });
      }

      if (httpMethod === 'GET') {
        const ledger = await getLedgerById(ledgerId);
        if (!ledger || ledger.user_id !== userId) {
          return errorResponse('账本不存在', 404);
        }
        const transactions = await getTransactionsByLedger(ledgerId, queryStringParameters?.month);
        return successResponse({ data: transactions });
      }
    }

    const transactionId = pathParts[pathParts.length - 1];

    if (httpMethod === 'POST') {
      const { ledgerId, type, category, amount, remark, date, time } = JSON.parse(event.body);
      if (!ledgerId || !type || !category || !amount || !date || !time) {
        return errorResponse('缺少必要参数');
      }

      const ledger = await getLedgerById(ledgerId);
      if (!ledger || ledger.user_id !== userId) {
        return errorResponse('账本不存在', 404);
      }

      const transaction = await createTransaction(ledgerId, type, category, amount, remark, date, time);
      return successResponse({ data: { id: transaction.id } }, '交易记录创建成功');
    }

    if (httpMethod === 'PUT' && !isNaN(transactionId)) {
      const { type, category, amount, remark, date, time } = JSON.parse(event.body);
      await updateTransaction(parseInt(transactionId), type, category, amount, remark, date, time);
      return successResponse({}, '交易记录更新成功');
    }

    if (httpMethod === 'DELETE' && !isNaN(transactionId)) {
      const success = await deleteTransaction(parseInt(transactionId));
      if (!success) return errorResponse('交易记录不存在', 404);
      return successResponse({}, '交易记录删除成功');
    }

    return errorResponse('方法不支持', 405);
  } catch (err) {
    return errorResponse('服务器错误: ' + err.message, 500);
  }
};