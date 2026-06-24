const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

function validatePassword(password) {
  if (password.length < 8) {
    return { valid: false, message: '密码长度至少8位' };
  }
  if (!/[A-Za-z]/.test(password)) {
    return { valid: false, message: '密码必须包含字母' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: '密码必须包含数字' };
  }
  return { valid: true, message: '' };
}

function generateToken(userId, username) {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

async function authenticate(event) {
  const authHeader = event.headers.authorization;
  if (!authHeader) {
    return { error: '未授权访问' };
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return { error: '未提供令牌' };
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return { error: '令牌无效或已过期' };
  }

  return { success: true, user: decoded };
}

module.exports = { validatePassword, generateToken, verifyToken, authenticate };