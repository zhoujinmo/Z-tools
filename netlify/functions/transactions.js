const {
  getLedgerById,
  createTransaction,
  getTransactionsByLedger,
  updateTransaction,
  deleteTransaction,
  batchDeleteTransactions,
  restoreTransaction,
  batchRestoreTransactions,
  getDeletedTransactions,
  getTransactionStats
} = require('./utils/db');
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

    // 获取已删除的交易记录
    if (path.includes('/deleted/') && httpMethod === 'GET') {
      const ledgerIdx = pathParts.indexOf('deleted');
      const ledgerId = parseInt(pathParts[ledgerIdx + 1]);
      const ledger = await getLedgerById(ledgerId);
      if (!ledger || ledger.user_id !== userId) {
        return errorResponse('账本不存在', 404);
      }
      const deleted = await getDeletedTransactions(ledgerId);
      return successResponse({ data: deleted });
    }

    // 批量删除
    if (path.includes('/batch-delete') && httpMethod === 'POST') {
      const { ids } = JSON.parse(event.body);
      if (!Array.isArray(ids) || ids.length === 0) {
        return errorResponse('缺少ids参数');
      }
      const count = await batchDeleteTransactions(ids, userId);
      return successResponse({ data: { count } }, `批量删除${count}条记录`);
    }

    // 批量恢复
    if (path.includes('/batch-restore') && httpMethod === 'POST') {
      const { ids } = JSON.parse(event.body);
      if (!Array.isArray(ids) || ids.length === 0) {
        return errorResponse('缺少ids参数');
      }
      const count = await batchRestoreTransactions(ids);
      return successResponse({ data: { count } }, `批量恢复${count}条记录`);
    }

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

    // 恢复单条记录
    if (path.includes('/restore/') && httpMethod === 'POST') {
      const restoreIdx = pathParts.indexOf('restore');
      const transactionId = parseInt(pathParts[restoreIdx + 1]);
      const success = await restoreTransaction(transactionId);
      if (!success) return errorResponse('记录不存在或未删除', 404);
      return successResponse({}, '记录恢复成功');
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
      const success = await deleteTransaction(parseInt(transactionId), userId);
      if (!success) return errorResponse('交易记录不存在', 404);
      return successResponse({}, '交易记录删除成功');
    }

    return errorResponse('方法不支持', 405);
  } catch (err) {
    return errorResponse('服务器错误: ' + err.message, 500);
  }
};