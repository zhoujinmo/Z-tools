const express = require('express');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  db.all('SELECT id, name, description, created_at FROM ledgers WHERE user_id = ?', [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: '获取账本列表失败' });
    }

    res.json({
      success: true,
      data: rows
    });
  });
});

router.get('/:id', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const ledgerId = req.params.id;

  db.get('SELECT id, name, description, created_at FROM ledgers WHERE id = ? AND user_id = ?', [ledgerId, userId], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: '获取账本失败' });
    }

    if (!row) {
      return res.status(404).json({ success: false, message: '账本不存在' });
    }

    res.json({
      success: true,
      data: row
    });
  });
});

router.post('/', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: '账本名称不能为空' });
  }

  db.run(
    'INSERT INTO ledgers (user_id, name, description) VALUES (?, ?, ?)',
    [userId, name, description],
    function (err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(400).json({ success: false, message: '账本名称已存在' });
        }
        return res.status(500).json({ success: false, message: '创建账本失败' });
      }

      res.json({
        success: true,
        message: '账本创建成功',
        data: { id: this.lastID, name, description }
      });
    }
  );
});

router.put('/:id', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const ledgerId = req.params.id;
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: '账本名称不能为空' });
  }

  db.run(
    'UPDATE ledgers SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
    [name, description, ledgerId, userId],
    function (err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(400).json({ success: false, message: '账本名称已存在' });
        }
        return res.status(500).json({ success: false, message: '更新账本失败' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: '账本不存在' });
      }

      res.json({
        success: true,
        message: '账本更新成功'
      });
    }
  );
});

router.delete('/:id', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const ledgerId = req.params.id;

  db.run('DELETE FROM ledgers WHERE id = ? AND user_id = ?', [ledgerId, userId], function (err) {
    if (err) {
      return res.status(500).json({ success: false, message: '删除账本失败' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: '账本不存在' });
    }

    res.json({
      success: true,
      message: '账本删除成功'
    });
  });
});

module.exports = router;