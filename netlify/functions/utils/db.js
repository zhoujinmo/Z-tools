const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

function getDB() {
  if (!supabase) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
    }
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

async function getUserByUsername(username) {
  const db = getDB();
  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('username', username)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

async function getUserById(id) {
  const db = getDB();
  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

async function createUser(username, password, email) {
  const db = getDB();
  const { data, error } = await db
    .from('users')
    .insert({ username, password, email })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function createLedger(userId, name, description) {
  const db = getDB();
  const { data, error } = await db
    .from('ledgers')
    .insert({ user_id: userId, name, description: description || '' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getLedgersByUserId(userId) {
  const db = getDB();
  const { data, error } = await db
    .from('ledgers')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data;
}

async function getLedgerById(id) {
  const db = getDB();
  const { data, error } = await db
    .from('ledgers')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

async function updateLedger(id, name, description) {
  const db = getDB();
  const { data, error } = await db
    .from('ledgers')
    .update({ name, description: description || '', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteLedger(id) {
  const db = getDB();
  await db.from('transactions').delete().eq('ledger_id', id);
  const { error } = await db.from('ledgers').delete().eq('id', id);
  if (error) throw error;
  return true;
}

async function createTransaction(ledgerId, type, category, amount, remark, date, time) {
  const db = getDB();
  const { data, error } = await db
    .from('transactions')
    .insert({
      ledger_id: ledgerId,
      type,
      category,
      amount: parseFloat(amount),
      remark: remark || '',
      date,
      time: parseInt(time)
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getTransactionsByLedger(ledgerId, month) {
  const db = getDB();
  let query = db.from('transactions')
    .select('*')
    .eq('ledger_id', ledgerId)
    .eq('is_delete', false);
  if (month) {
    query = query.like('date', `${month}%`);
  }
  const { data, error } = await query.order('date', { ascending: false }).order('time', { ascending: false });
  if (error) throw error;
  return data;
}

async function updateTransaction(id, type, category, amount, remark, date, time) {
  const db = getDB();
  const { data, error } = await db
    .from('transactions')
    .update({
      type,
      category,
      amount: parseFloat(amount),
      remark: remark || '',
      date,
      time: parseInt(time),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('is_delete', false)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteTransaction(id, deletedBy) {
  const db = getDB();
  const { data, error } = await db
    .from('transactions')
    .update({
      is_delete: true,
      deleted_by: deletedBy || null,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('is_delete', false)
    .select()
    .single();
  if (error) throw error;
  return true;
}

async function batchDeleteTransactions(ids, deletedBy) {
  const db = getDB();
  const { data, error } = await db
    .from('transactions')
    .update({
      is_delete: true,
      deleted_by: deletedBy || null,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .in('id', ids)
    .eq('is_delete', false)
    .select();
  if (error) throw error;
  return data.length;
}

async function restoreTransaction(id) {
  const db = getDB();
  const { data, error } = await db
    .from('transactions')
    .update({
      is_delete: false,
      deleted_by: null,
      deleted_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('is_delete', true)
    .select()
    .single();
  if (error) throw error;
  return true;
}

async function batchRestoreTransactions(ids) {
  const db = getDB();
  const { data, error } = await db
    .from('transactions')
    .update({
      is_delete: false,
      deleted_by: null,
      deleted_at: null,
      updated_at: new Date().toISOString()
    })
    .in('id', ids)
    .eq('is_delete', true)
    .select();
  if (error) throw error;
  return data.length;
}

async function getDeletedTransactions(ledgerId) {
  const db = getDB();
  const { data, error } = await db
    .from('transactions')
    .select('*')
    .eq('ledger_id', ledgerId)
    .eq('is_delete', true)
    .order('deleted_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function getTransactionStats(ledgerId, month) {
  const transactions = await getTransactionsByLedger(ledgerId, month);
  const stats = { income: 0, expense: 0 };
  transactions.forEach(t => {
    if (t.type === 'income') {
      stats.income += t.amount;
    } else {
      stats.expense += t.amount;
    }
  });
  return stats;
}

async function upsertSyncRecord(userId, lastSyncTime) {
  const db = getDB();
  const { data: existing } = await db
    .from('sync_records')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existing) {
    const { error } = await db
      .from('sync_records')
      .update({ last_sync_time: lastSyncTime })
      .eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await db
      .from('sync_records')
      .insert({ user_id: userId, last_sync_time: lastSyncTime });
    if (error) throw error;
  }
}

async function getSyncRecord(userId) {
  const db = getDB();
  const { data, error } = await db
    .from('sync_records')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

async function getAllUserTransactions(userId) {
  const ledgers = await getLedgersByUserId(userId);
  const ledgerIds = ledgers.map(l => l.id);
  if (ledgerIds.length === 0) return [];

  const db = getDB();
  const { data, error } = await db
    .from('transactions')
    .select('*')
    .in('ledger_id', ledgerIds)
    .eq('is_delete', false);
  if (error) throw error;
  return data;
}

module.exports = {
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
  batchDeleteTransactions,
  restoreTransaction,
  batchRestoreTransactions,
  getDeletedTransactions,
  getTransactionStats,
  upsertSyncRecord,
  getSyncRecord,
  getAllUserTransactions
};