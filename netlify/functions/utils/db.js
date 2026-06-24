const { NetlifyKV } = require('@netlify/kv');

const KV_NAMESPACE = process.env.KV_NAMESPACE || 'BUDGET_APP';

let db = {
  users: [],
  ledgers: [],
  transactions: [],
  sync_records: []
};

let userIdCounter = 1;
let ledgerIdCounter = 1;
let transactionIdCounter = 1;
let kv = null;
let isLoaded = false;

async function initKV() {
  if (kv) return;
  kv = new NetlifyKV({ namespace: KV_NAMESPACE });
}

async function loadFromKV() {
  if (isLoaded) return;
  
  try {
    await initKV();
    
    const dataStr = await kv.get('budget_db');
    if (dataStr) {
      const saved = JSON.parse(dataStr);
      db = saved.db;
      userIdCounter = saved.userIdCounter || 1;
      ledgerIdCounter = saved.ledgerIdCounter || 1;
      transactionIdCounter = saved.transactionIdCounter || 1;
    }
  } catch (err) {
    console.log('KV加载失败，使用内存存储:', err.message);
  }
  isLoaded = true;
}

async function saveToKV() {
  try {
    await initKV();
    await kv.set('budget_db', JSON.stringify({
      db,
      userIdCounter,
      ledgerIdCounter,
      transactionIdCounter
    }));
  } catch (err) {
    console.log('KV保存失败:', err.message);
  }
}

function initDB() {
  db = {
    users: [],
    ledgers: [],
    transactions: [],
    sync_records: []
  };
}

async function getUserByUsername(username) {
  await loadFromKV();
  return db.users.find(u => u.username === username);
}

async function getUserById(id) {
  await loadFromKV();
  return db.users.find(u => u.id === id);
}

async function createUser(username, password, email) {
  await loadFromKV();
  const user = {
    id: userIdCounter++,
    username,
    password,
    email,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.users.push(user);
  await saveToKV();
  return user;
}

async function createLedger(userId, name, description) {
  await loadFromKV();
  const ledger = {
    id: ledgerIdCounter++,
    user_id: userId,
    name,
    description: description || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.ledgers.push(ledger);
  await saveToKV();
  return ledger;
}

async function getLedgersByUserId(userId) {
  await loadFromKV();
  return db.ledgers.filter(l => l.user_id === userId);
}

async function getLedgerById(id) {
  await loadFromKV();
  return db.ledgers.find(l => l.id === id);
}

async function updateLedger(id, name, description) {
  await loadFromKV();
  const ledger = await getLedgerById(id);
  if (ledger) {
    ledger.name = name;
    ledger.description = description || '';
    ledger.updated_at = new Date().toISOString();
    await saveToKV();
  }
  return ledger;
}

async function deleteLedger(id) {
  await loadFromKV();
  const index = db.ledgers.findIndex(l => l.id === id);
  if (index > -1) {
    db.ledgers.splice(index, 1);
    db.transactions = db.transactions.filter(t => t.ledger_id !== id);
    await saveToKV();
    return true;
  }
  return false;
}

async function createTransaction(ledgerId, type, category, amount, remark, date, time) {
  await loadFromKV();
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
  await saveToKV();
  return transaction;
}

async function getTransactionsByLedger(ledgerId, month) {
  await loadFromKV();
  let result = db.transactions.filter(t => t.ledger_id === ledgerId);
  if (month) {
    result = result.filter(t => t.date.startsWith(month));
  }
  return result.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    return dateCompare !== 0 ? dateCompare : b.time - a.time;
  });
}

async function updateTransaction(id, type, category, amount, remark, date, time) {
  await loadFromKV();
  const transaction = db.transactions.find(t => t.id === id);
  if (transaction) {
    transaction.type = type;
    transaction.category = category;
    transaction.amount = parseFloat(amount);
    transaction.remark = remark || '';
    transaction.date = date;
    transaction.time = parseInt(time);
    transaction.updated_at = new Date().toISOString();
    await saveToKV();
  }
  return transaction;
}

async function deleteTransaction(id) {
  await loadFromKV();
  const index = db.transactions.findIndex(t => t.id === id);
  if (index > -1) {
    db.transactions.splice(index, 1);
    await saveToKV();
    return true;
  }
  return false;
}

async function getTransactionStats(ledgerId, month) {
  await loadFromKV();
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

async function upsertSyncRecord(userId, lastSyncTime) {
  await loadFromKV();
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
  await saveToKV();
}

async function getSyncRecord(userId) {
  await loadFromKV();
  return db.sync_records.find(r => r.user_id === userId);
}

async function getAllUserTransactions(userId) {
  await loadFromKV();
  const userLedgers = await getLedgersByUserId(userId);
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