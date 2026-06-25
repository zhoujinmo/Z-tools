const express = require('express');
const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/export', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  db.all(
    'SELECT l.id as ledger_id, l.name as ledger_name, l.description as ledger_description, t.* FROM transactions t JOIN ledgers l ON t.ledger_id = l.id WHERE l.user_id = ?',
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: '导出数据失败' });
      }

      const ledgers = {};
      const transactions = [];

      rows.forEach(row => {
        if (!ledgers[row.ledger_id]) {
          ledgers[row.ledger_id] = {
            id: row.ledger_id,
            name: row.ledger_name,
            description: row.ledger_description
          };
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
          createdAt: row.created_at,
          updatedAt: row.updated_at
        });
      });

      const backupData = {
        exportTime: new Date().toISOString(),
        userId,
        ledgers: Object.values(ledgers),
        transactions
      };

      res.json({
        success: true,
        data: backupData
      });
    }
  );
});

router.post('/import', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { ledgers, transactions } = req.body;

  if (!ledgers || !Array.isArray(ledgers) || !transactions || !Array.isArray(transactions)) {
    return res.status(400).json({ success: false, message: '无效的数据格式' });
  }

  let ledgerMap = {};
  let successCount = 0;
  let skipCount = 0;

  const processLedgers = (ledgerIndex) => {
    if (ledgerIndex >= ledgers.length) {
      processTransactions(0);
      return;
    }

    const ledger = ledgers[ledgerIndex];
    db.run(
      'INSERT OR IGNORE INTO ledgers (user_id, name, description) VALUES (?, ?, ?)',
      [userId, ledger.name, ledger.description],
      function (err) {
        if (!err) {
          if (this.changes > 0) {
            ledgerMap[ledger.id] = this.lastID;
          } else {
            db.get('SELECT id FROM ledgers WHERE user_id = ? AND name = ?', [userId, ledger.name], (err, row) => {
              if (row) ledgerMap[ledger.id] = row.id;
            });
          }
        }
        processLedgers(ledgerIndex + 1);
      }
    );
  };

  const processTransactions = (transIndex) => {
    if (transIndex >= transactions.length) {
      res.json({
        success: true,
        message: `导入完成: 成功 ${successCount}, 跳过 ${skipCount}`,
        stats: { success: successCount, skip: skipCount }
      });
      return;
    }

    const trans = transactions[transIndex];
    const actualLedgerId = ledgerMap[trans.ledgerId] || trans.ledgerId;

    db.run(
      'INSERT OR IGNORE INTO transactions (ledger_id, type, category, amount, remark, date, time) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [actualLedgerId, trans.type, trans.category, trans.amount, trans.remark, trans.date, trans.time],
      function (err) {
        if (!err) {
          if (this.changes > 0) {
            successCount++;
          } else {
            skipCount++;
          }
        } else {
          skipCount++;
        }
        processTransactions(transIndex + 1);
      }
    );
  };

  processLedgers(0);
});

router.post('/auto-backup', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const backupDir = path.join(__dirname, '../backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  db.all(
    'SELECT l.id as ledger_id, l.name as ledger_name, l.description as ledger_description, t.* FROM transactions t JOIN ledgers l ON t.ledger_id = l.id WHERE l.user_id = ?',
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: '备份失败' });
      }

      const ledgers = {};
      const transactions = [];

      rows.forEach(row => {
        if (!ledgers[row.ledger_id]) {
          ledgers[row.ledger_id] = {
            id: row.ledger_id,
            name: row.ledger_name,
            description: row.ledger_description
          };
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
          createdAt: row.created_at,
          updatedAt: row.updated_at
        });
      });

      const backupData = {
        exportTime: new Date().toISOString(),
        userId,
        ledgers: Object.values(ledgers),
        transactions
      };

      const fileName = `backup_${userId}_${Date.now()}.json`;
      const filePath = path.join(backupDir, fileName);

      fs.writeFile(filePath, JSON.stringify(backupData, null, 2), (err) => {
        if (err) {
          return res.status(500).json({ success: false, message: '保存备份文件失败' });
        }

        res.json({
          success: true,
          message: '自动备份成功',
          fileName
        });
      });
    }
  );
});

router.get('/list-backups', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const backupDir = path.join(__dirname, '../backups');

  if (!fs.existsSync(backupDir)) {
    return res.json({ success: true, data: [] });
  }

  fs.readdir(backupDir, (err, files) => {
    if (err) {
      return res.status(500).json({ success: false, message: '读取备份列表失败' });
    }

    const userBackups = files
      .filter(f => f.startsWith(`backup_${userId}_`))
      .map(f => ({
        fileName: f,
        timestamp: f.replace(`backup_${userId}_`, '').replace('.json', '')
      }))
      .sort((a, b) => b.timestamp - a.timestamp);

    res.json({
      success: true,
      data: userBackups
    });
  });
});

module.exports = router;