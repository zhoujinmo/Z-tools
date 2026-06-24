const express = require('express');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/status', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  db.get('SELECT last_sync_time, sync_token FROM sync_records WHERE user_id = ?', [userId], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: '获取同步状态失败' });
    }

    res.json({
      success: true,
      data: {
        lastSyncTime: row?.last_sync_time || null,
        syncToken: row?.sync_token || null
      }
    });
  });
});

router.post('/pull', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { lastSyncTime, ledgerId } = req.body;

  let query = `
    SELECT t.* FROM transactions t
    JOIN ledgers l ON t.ledger_id = l.id
    WHERE l.user_id = ?
  `;
  const params = [userId];

  if (ledgerId) {
    query += ' AND t.ledger_id = ?';
    params.push(ledgerId);
  }

  if (lastSyncTime) {
    query += ' AND t.updated_at > ?';
    params.push(lastSyncTime);
  }

  db.all(query, params, (err, transactions) => {
    if (err) {
      return res.status(500).json({ success: false, message: '拉取数据失败' });
    }

    db.run(
      'INSERT OR REPLACE INTO sync_records (user_id, last_sync_time) VALUES (?, CURRENT_TIMESTAMP)',
      [userId],
      () => {
        res.json({
          success: true,
          data: transactions,
          syncTime: new Date().toISOString()
        });
      }
    );
  });
});

router.post('/push', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { transactions } = req.body;

  if (!transactions || !Array.isArray(transactions)) {
    return res.status(400).json({ success: false, message: '无效的数据格式' });
  }

  let successCount = 0;
  let conflictCount = 0;
  let errorCount = 0;

  const processTransaction = (index) => {
    if (index >= transactions.length) {
      db.run(
        'INSERT OR REPLACE INTO sync_records (user_id, last_sync_time) VALUES (?, CURRENT_TIMESTAMP)',
        [userId],
        () => {
          res.json({
            success: true,
            message: `同步完成: 成功 ${successCount}, 冲突 ${conflictCount}, 失败 ${errorCount}`,
            stats: { success: successCount, conflict: conflictCount, error: errorCount },
            syncTime: new Date().toISOString()
          });
        }
      );
      return;
    }

    const item = transactions[index];

    db.get('SELECT id FROM ledgers WHERE id = ? AND user_id = ?', [item.ledgerId, userId], (err, ledger) => {
      if (err || !ledger) {
        errorCount++;
        processTransaction(index + 1);
        return;
      }

      db.get(
        'SELECT id, updated_at FROM transactions WHERE ledger_id = ? AND date = ? AND time = ?',
        [item.ledgerId, item.date, item.time],
        (err, existing) => {
          if (err) {
            errorCount++;
            processTransaction(index + 1);
            return;
          }

          if (existing) {
            db.run(
              'UPDATE transactions SET type = ?, category = ?, amount = ?, remark = ?, sync_status = "synced", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [item.type, item.category, item.amount, item.remark, existing.id],
              function (err) {
                if (err) {
                  errorCount++;
                } else {
                  successCount++;
                }
                processTransaction(index + 1);
              }
            );
          } else {
            db.run(
              'INSERT INTO transactions (ledger_id, type, category, amount, remark, date, time, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, "synced")',
              [item.ledgerId, item.type, item.category, item.amount, item.remark, item.date, item.time],
              function (err) {
                if (err) {
                  errorCount++;
                } else {
                  successCount++;
                }
                processTransaction(index + 1);
              }
            );
          }
        }
      );
    });
  };

  processTransaction(0);
});

router.post('/full-sync', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  db.all(
    'SELECT l.id as ledger_id, l.name as ledger_name, t.* FROM transactions t JOIN ledgers l ON t.ledger_id = l.id WHERE l.user_id = ?',
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: '获取完整数据失败' });
      }

      const ledgers = {};
      const transactions = [];

      rows.forEach(row => {
        if (!ledgers[row.ledger_id]) {
          ledgers[row.ledger_id] = { id: row.ledger_id, name: row.ledger_name };
        }
        transactions.push({
          id: row.id,
          ledgerId: row.ledger_id,
          type: row.type,
          category: row.category,
          amount: row.amount,
          remark: row.remark,
          date: row.date,
          time: row.time,
          syncStatus: row.sync_status,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        });
      });

      db.run(
        'INSERT OR REPLACE INTO sync_records (user_id, last_sync_time) VALUES (?, CURRENT_TIMESTAMP)',
        [userId],
        () => {
          res.json({
            success: true,
            data: {
              ledgers: Object.values(ledgers),
              transactions
            },
            syncTime: new Date().toISOString()
          });
        }
      );
    }
  );
});

module.exports = router;