const express = require('express');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/ledger/:ledgerId', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const ledgerId = req.params.ledgerId;
  const { month } = req.query;

  let query = `
    SELECT t.* FROM transactions t
    JOIN ledgers l ON t.ledger_id = l.id
    WHERE l.user_id = ? AND t.ledger_id = ?
  `;
  const params = [userId, ledgerId];

  if (month) {
    query += ' AND t.date LIKE ?';
    params.push(`${month}%`);
  }

  query += ' ORDER BY t.date DESC, t.time DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: '获取交易记录失败' });
    }

    res.json({
      success: true,
      data: rows
    });
  });
});

router.get('/ledger/:ledgerId/stats', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const ledgerId = req.params.ledgerId;
  const { month } = req.query;

  let query = `
    SELECT t.type, SUM(t.amount) as total
    FROM transactions t
    JOIN ledgers l ON t.ledger_id = l.id
    WHERE l.user_id = ? AND t.ledger_id = ?
  `;
  const params = [userId, ledgerId];

  if (month) {
    query += ' AND t.date LIKE ?';
    params.push(`${month}%`);
  }

  query += ' GROUP BY t.type';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: '获取统计数据失败' });
    }

    const stats = { income: 0, expense: 0 };
    rows.forEach(row => {
      stats[row.type] = parseFloat(row.total) || 0;
    });

    res.json({
      success: true,
      data: stats
    });
  });
});

router.post('/', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { ledgerId, type, category, amount, remark, date, time } = req.body;

  if (!ledgerId || !type || !category || !amount || !date || !time) {
    return res.status(400).json({ success: false, message: '缺少必要参数' });
  }

  db.get('SELECT id FROM ledgers WHERE id = ? AND user_id = ?', [ledgerId, userId], (err, ledger) => {
    if (err || !ledger) {
      return res.status(404).json({ success: false, message: '账本不存在' });
    }

    db.run(
      'INSERT INTO transactions (ledger_id, type, category, amount, remark, date, time) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [ledgerId, type, category, amount, remark, date, time],
      function (err) {
        if (err) {
          return res.status(500).json({ success: false, message: '创建交易记录失败' });
        }

        res.json({
          success: true,
          message: '交易记录创建成功',
          data: { id: this.lastID }
        });
      }
    );
  });
});

router.put('/:id', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const transactionId = req.params.id;
  const { type, category, amount, remark, date, time } = req.body;

  db.get(
    'SELECT t.* FROM transactions t JOIN ledgers l ON t.ledger_id = l.id WHERE t.id = ? AND l.user_id = ?',
    [transactionId, userId],
    (err, transaction) => {
      if (err || !transaction) {
        return res.status(404).json({ success: false, message: '交易记录不存在' });
      }

      db.run(
        'UPDATE transactions SET type = ?, category = ?, amount = ?, remark = ?, date = ?, time = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [type, category, amount, remark, date, time, transactionId],
        function (err) {
          if (err) {
            return res.status(500).json({ success: false, message: '更新交易记录失败' });
          }

          res.json({
            success: true,
            message: '交易记录更新成功'
          });
        }
      );
    }
  );
});

router.delete('/:id', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const transactionId = req.params.id;

  db.run(
    'DELETE FROM transactions t WHERE t.id = ? AND EXISTS (SELECT 1 FROM ledgers l WHERE l.id = t.ledger_id AND l.user_id = ?)',
    [transactionId, userId],
    function (err) {
      if (err) {
        return res.status(500).json({ success: false, message: '删除交易记录失败' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: '交易记录不存在' });
      }

      res.json({
        success: true,
        message: '交易记录删除成功'
      });
    }
  );
});

module.exports = router;