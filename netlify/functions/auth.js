const bcrypt = require('bcryptjs');
const { getUserByUsername, getUserById, createUser, createLedger } = require('./utils/db');
const { validatePassword, generateToken, authenticate } = require('./utils/auth');

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

      const passwordCheck = validatePassword(password);
      if (!passwordCheck.valid) {
        return errorResponse(passwordCheck.message);
      }

      const existingUser = await getUserByUsername(username);
      if (existingUser) {
        return errorResponse('用户名已存在');
      }

      const hash = await bcrypt.hash(password, 10);
      const user = await createUser(username, hash, email);
      await createLedger(user.id, '我的账本', '');

      const token = generateToken(user.id, username);

      return successResponse({
        token,
        user: { id: user.id, username, email }
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

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return errorResponse('用户名或密码错误', 401);
      }

      const token = generateToken(user.id, user.username);

      return successResponse({
        token,
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