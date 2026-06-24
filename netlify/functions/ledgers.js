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
    const ledgers = getLedgersByUserId(userId);
    return successResponse({ data: ledgers });
  } catch (err) {
    return errorResponse('获取账本列表失败: ' + err.message, 500);
  }
}

async function handleGetLedger(userId, ledgerId) {
  try {
    const ledger = getLedgerById(ledgerId);
    
    if (!ledger || ledger.user_id !== userId) {
      return errorResponse('账本不存在', 404);
    }

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

    const existing = getLedgersByUserId(userId).find(l => l.name === name);
    if (existing) {
      return errorResponse('账本名称已存在');
    }

    const ledger = createLedger(userId, name, description);

    return successResponse({
      data: { id: ledger.id, name, description }
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

    const existing = getLedgerById(ledgerId);
    if (!existing || existing.user_id !== userId) {
      return errorResponse('账本不存在', 404);
    }

    const otherLedger = getLedgersByUserId(userId).find(l => l.name === name && l.id !== ledgerId);
    if (otherLedger) {
      return errorResponse('账本名称已存在');
    }

    updateLedger(ledgerId, name, description);

    return successResponse({}, '账本更新成功');
  } catch (err) {
    return errorResponse('更新账本失败: ' + err.message, 500);
  }
}

async function handleDeleteLedger(userId, ledgerId) {
  try {
    const ledger = getLedgerById(ledgerId);
    if (!ledger || ledger.user_id !== userId) {
      return errorResponse('账本不存在', 404);
    }

    deleteLedger(ledgerId);

    return successResponse({}, '账本删除成功');
  } catch (err) {
    return errorResponse('删除账本失败: ' + err.message, 500);
  }
}