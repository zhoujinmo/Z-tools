const bcrypt = require('bcryptjs');
const { getDB } = require('./utils/db');
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

  if (httpMethod === 'POST' && endpoint === 'register') {
    return await handleRegister(event);
  }

  if (httpMethod === 'POST' && endpoint === 'login') {
    return await handleLogin(event);
  }

  if (httpMethod === 'GET' && endpoint === 'verify') {
    return await handleVerify(event);
  }

  return errorResponse('方法不支持', 405);
};

async function handleRegister(event) {
  try {
    const { username, password, email } = JSON.parse(event.body);

    if (!username || !password) {
      return errorResponse('用户名和密码不能为空');
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return errorResponse(passwordCheck.message);
    }

    const db = await getDB();
    
    const existingUser = db.exec(`SELECT id FROM users WHERE username = '${username}'`);
    if (existingUser.length > 0 && existingUser[0].values.length > 0) {
      return errorResponse('用户名已存在');
    }

    const hash = await bcrypt.hash(password, 10);
    db.run(`INSERT INTO users (username, password, email) VALUES ('${username}', '${hash}', '${email || ''}')`);
    
    const userId = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0];
    
    db.run(`INSERT INTO ledgers (user_id, name) VALUES (${userId}, '我的账本')`);

    const token = generateToken(userId, username);
    
    return successResponse({
      token,
      user: { id: userId, username, email }
    }, '注册成功');
  } catch (err) {
    return errorResponse('注册失败: ' + err.message, 500);
  }
}

async function handleLogin(event) {
  try {
    const { username, password } = JSON.parse(event.body);

    if (!username || !password) {
      return errorResponse('用户名和密码不能为空');
    }

    const db = await getDB();
    const result = db.exec(`SELECT id, username, password FROM users WHERE username = '${username}'`);
    
    if (result.length === 0 || result[0].values.length === 0) {
      return errorResponse('用户名或密码错误', 401);
    }

    const user = {
      id: result[0].values[0][0],
      username: result[0].values[0][1],
      password: result[0].values[0][2]
    };

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return errorResponse('用户名或密码错误', 401);
    }

    const token = generateToken(user.id, user.username);
    
    return successResponse({
      token,
      user: { id: user.id, username: user.username }
    }, '登录成功');
  } catch (err) {
    return errorResponse('登录失败: ' + err.message, 500);
  }
}

async function handleVerify(event) {
  const authResult = await authenticate(event);
  if (!authResult.success) {
    return errorResponse(authResult.error, 401);
  }

  const db = await getDB();
  const result = db.exec(`SELECT id, username FROM users WHERE id = ${authResult.user.userId}`);
  
  if (result.length === 0 || result[0].values.length === 0) {
    return errorResponse('用户不存在', 401);
  }

  const user = {
    id: result[0].values[0][0],
    username: result[0].values[0][1]
  };

  return successResponse({ user });
}