const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const router = express.Router();

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

router.post('/register', (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
  }

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) {
    return res.status(400).json({ success: false, message: passwordCheck.message });
  }

  db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: '数据库错误' });
    }

    if (row) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }

    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        return res.status(500).json({ success: false, message: '密码加密失败' });
      }

      db.run(
        'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
        [username, hash, email],
        function (err) {
          if (err) {
            return res.status(500).json({ success: false, message: '注册失败' });
          }

          const defaultLedgerName = '我的账本';
          db.run(
            'INSERT INTO ledgers (user_id, name) VALUES (?, ?)',
            [this.lastID, defaultLedgerName],
            (err) => {
              if (err) {
                return res.status(500).json({ success: false, message: '创建账本失败' });
              }

              const token = jwt.sign({ userId: this.lastID, username }, JWT_SECRET, { expiresIn: '7d' });
              res.json({
                success: true,
                message: '注册成功',
                token,
                user: { id: this.lastID, username, email }
              });
            }
          );
        }
      );
    });
  });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
  }

  db.get('SELECT id, username, password FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ success: false, message: '数据库错误' });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err || !isMatch) {
        return res.status(401).json({ success: false, message: '用户名或密码错误' });
      }

      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
      res.json({
        success: true,
        message: '登录成功',
        token,
        user: { id: user.id, username: user.username }
      });
    });
  });
});

router.get('/verify', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: '未提供令牌' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ success: false, message: '令牌无效或已过期' });
    }

    db.get('SELECT id, username FROM users WHERE id = ?', [decoded.userId], (err, user) => {
      if (err || !user) {
        return res.status(401).json({ success: false, message: '用户不存在' });
      }

      res.json({
        success: true,
        user: { id: user.id, username: user.username }
      });
    });
  });
});

module.exports = router;