const { getUserByUsername, getUserById, createUser, createLedger, updateUserUsername } = require('./utils/db');
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
  const { httpMethod, path } = event;
  const endpoint = path.replace('/api/auth/', '');

  try {
    if (httpMethod === 'POST' && endpoint === 'register') {
      const { username, password, email } = JSON.parse(event.body);

      if (!username || !password) {
        return errorResponse('用户名和密码不能为空');
      }

      if (password.length < 8) {
        return errorResponse('密码长度至少8位');
      }

      if (!/[A-Za-z]/.test(password)) {
        return errorResponse('密码必须包含字母');
      }

      if (!/[0-9]/.test(password)) {
        return errorResponse('密码必须包含数字');
      }

      const existingUser = await getUserByUsername(username);
      if (existingUser) {
        return errorResponse('用户名已存在');
      }

      let emailToUse = email || `${username}@bill.app`;
      
      const user = await createUser(username, emailToUse, password);
      await createLedger(user.id, '我的账本', '');

      return successResponse({
        user: { id: user.id, username, email: emailToUse }
      }, '注册成功');
    }

    if (httpMethod === 'POST' && endpoint === 'login') {
      const { username, password } = JSON.parse(event.body);

      if (!username || !password) {
        return errorResponse('用户名和密码不能为空');
      }

      const user = await getUserByUsername(username);
      if (!user) {
        return errorResponse('用户名或密码错误', 401);
      }

      const db = require('./utils/db').getDB();
      const { data: authResult, error: authError } = await db.auth.signInWithPassword({
        email: user.email,
        password
      });

      if (authError) {
        return errorResponse('用户名或密码错误', 401);
      }

      return successResponse({
        user: { id: user.id, username: user.username }
      }, '登录成功');
    }

    if (httpMethod === 'GET' && endpoint === 'verify') {
      const authResult = await authenticate(event);
      if (!authResult.success) {
        return errorResponse(authResult.error, 401);
      }

      const user = await getUserById(authResult.user.userId);
      if (!user) {
        return errorResponse('用户不存在', 401);
      }

      return successResponse({ user: { id: user.id, username: user.username } });
    }

    return errorResponse('方法不支持', 405);
  } catch (err) {
    return errorResponse('服务器错误: ' + err.message, 500);
  }
};