let db = {
  users: [],
  ledgers: [],
  transactions: [],
  sync_records: []
};

let userIdCounter = 1;
let ledgerIdCounter = 1;
let transactionIdCounter = 1;

function initDB() {
  db = {
    users: [],
    ledgers: [],
    transactions: [],
    sync_records: []
  };
}

function getUserByUsername(username) {
  return db.users.find(u => u.username === username);
}

function getUserById(id) {
  return db.users.find(u => u.id === id);
}

function createUser(username, password, email) {
  const user = {
    id: userIdCounter++,
    username,
    password,
    email,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.users.push(user);
  return user;
}

function createLedger(userId, name, description) {
  const ledger = {
    id: ledgerIdCounter++,
    user_id: userId,
    name,
    description: description || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.ledgers.push(ledger);
  return ledger;
}

function getLedgersByUserId(userId) {
  return db.ledgers.filter(l => l.user_id === userId);
}

function getLedgerById(id) {
  return db.ledgers.find(l => l.id === id);
}

function updateLedger(id, name, description) {
  const ledger = getLedgerById(id);
  if (ledger) {
    ledger.name = name;
    ledger.description = description || '';
    ledger.updated_at = new Date().toISOString();
  }
  return ledger;
}

function deleteLedger(id) {
  const index = db.ledgers.findIndex(l => l.id === id);
  if (index > -1) {
    db.ledgers.splice(index, 1);
    db.transactions = db.transactions.filter(t => t.ledger_id !== id);
    return true;
  }
  return false;
}

function createTransaction(ledgerId, type, category, amount, remark, date, time) {
  const transaction = {
    id: transactionIdCounter++,
    ledger_id: ledgerId,
    type,
    category,
    amount: parseFloat(amount),
    remark: remark || '',
    date,
    time: parseInt(time),
    sync_status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.transactions.push(transaction);
  return transaction;
}

function getTransactionsByLedger(ledgerId, month) {
  let result = db.transactions.filter(t => t.ledger_id === ledgerId);
  if (month) {
    result = result.filter(t => t.date.startsWith(month));
  }
  return result.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    return dateCompare !== 0 ? dateCompare : b.time - a.time;
  });
}

function updateTransaction(id, type, category, amount, remark, date, time) {
  const transaction = db.transactions.find(t => t.id === id);
  if (transaction) {
    transaction.type = type;
    transaction.category = category;
    transaction.amount = parseFloat(amount);
    transaction.remark = remark || '';
    transaction.date = date;
    transaction.time = parseInt(time);
    transaction.updated_at = new Date().toISOString();
  }
  return transaction;
}

function deleteTransaction(id) {
  const index = db.transactions.findIndex(t => t.id === id);
  if (index > -1) {
    db.transactions.splice(index, 1);
    return true;
  }
  return false;
}

function getTransactionStats(ledgerId, month) {
  let filtered = db.transactions.filter(t => t.ledger_id === ledgerId);
  if (month) {
    filtered = filtered.filter(t => t.date.startsWith(month));
  }
  const stats = { income: 0, expense: 0 };
  filtered.forEach(t => {
    if (t.type === 'income') {
      stats.income += t.amount;
    } else {
      stats.expense += t.amount;
    }
  });
  return stats;
}

function upsertSyncRecord(userId, lastSyncTime) {
  const existing = db.sync_records.find(r => r.user_id === userId);
  if (existing) {
    existing.last_sync_time = lastSyncTime;
  } else {
    db.sync_records.push({
      id: db.sync_records.length + 1,
      user_id: userId,
      last_sync_time: lastSyncTime,
      sync_token: null,
      created_at: new Date().toISOString()
    });
  }
}

function getSyncRecord(userId) {
  return db.sync_records.find(r => r.user_id === userId);
}

function getAllUserTransactions(userId) {
  const userLedgers = getLedgersByUserId(userId);
  const ledgerIds = userLedgers.map(l => l.id);
  return db.transactions.filter(t => ledgerIds.includes(t.ledger_id));
}

module.exports = {
  initDB,
  getUserByUsername,
  getUserById,
  createUser,
  createLedger,
  getLedgersByUserId,
  getLedgerById,
  updateLedger,
  deleteLedger,
  createTransaction,
  getTransactionsByLedger,
  updateTransaction,
  deleteTransaction,
  getTransactionStats,
  upsertSyncRecord,
  getSyncRecord,
  getAllUserTransactions,
  db
};