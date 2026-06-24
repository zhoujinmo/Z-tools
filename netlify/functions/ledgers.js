const { getLedgersByUserId, getLedgerById, createLedger, updateLedger, deleteLedger } = require('./utils/db');
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
    const { httpMethod, path } = event;
    const pathParts = path.split('/');
    const ledgerId = pathParts[pathParts.length - 1];

    if (httpMethod === 'GET' && !isNaN(ledgerId)) {
      const ledger = await getLedgerById(parseInt(ledgerId));
      if (!ledger || ledger.user_id !== userId) {
        return errorResponse('账本不存在', 404);
      }
      return successResponse({ data: ledger });
    }

    if (httpMethod === 'GET') {
      const ledgers = await getLedgersByUserId(userId);
      return successResponse({ data: ledgers });
    }

    if (httpMethod === 'POST') {
      const { name, description } = JSON.parse(event.body);
      if (!name) return errorResponse('账本名称不能为空');

      const existing = await getLedgersByUserId(userId);
      if (existing.find(l => l.name === name)) {
        return errorResponse('账本名称已存在');
      }

      const ledger = await createLedger(userId, name, description);
      return successResponse({ data: { id: ledger.id, name, description } }, '账本创建成功');
    }

    if (httpMethod === 'PUT' && !isNaN(ledgerId)) {
      const { name, description } = JSON.parse(event.body);
      if (!name) return errorResponse('账本名称不能为空');

      const existing = await getLedgerById(parseInt(ledgerId));
      if (!existing || existing.user_id !== userId) {
        return errorResponse('账本不存在', 404);
      }

      await updateLedger(parseInt(ledgerId), name, description);
      return successResponse({}, '账本更新成功');
    }

    if (httpMethod === 'DELETE' && !isNaN(ledgerId)) {
      const ledger = await getLedgerById(parseInt(ledgerId));
      if (!ledger || ledger.user_id !== userId) {
        return errorResponse('账本不存在', 404);
      }

      await deleteLedger(parseInt(ledgerId));
      return successResponse({}, '账本删除成功');
    }

    return errorResponse('方法不支持', 405);
  } catch (err) {
    return errorResponse('服务器错误: ' + err.message, 500);
  }
};