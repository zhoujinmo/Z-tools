import { createClient } from "@/lib/supabase/server";
import type {
  Ledger,
  Transaction,
  TransactionStats,
  SyncRecord,
  ClientTransaction,
} from "@/lib/types";

// ============ Profile 相关 ============

export async function getProfileByUserId(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function getProfileByUsername(username: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function updateProfileUsername(userId: string, username: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ username, updated_at: new Date().toISOString() } as never)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============ Ledger 相关 ============

export async function getLedgersByUserId(userId: string): Promise<Ledger[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ledgers")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Ledger[];
}

export async function getLedgerById(id: string): Promise<Ledger | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ledgers")
    .select("*")
    .eq("id", id)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data as Ledger | null;
}

export async function getLedgerByIdAndUser(
  id: string,
  userId: string
): Promise<Ledger | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ledgers")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data as Ledger | null;
}

export async function createLedger(
  userId: string,
  name: string,
  description: string = ""
): Promise<Ledger> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ledgers")
    .insert({ user_id: userId, name, description } as never)
    .select()
    .single();
  if (error) throw error;
  return data as Ledger;
}

export async function updateLedger(
  id: string,
  name: string,
  description: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("ledgers")
    .update({ name, description, updated_at: new Date().toISOString() } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteLedger(id: string): Promise<void> {
  const supabase = createClient();
  // 先删除关联的交易记录
  await supabase.from("transactions").delete().eq("ledger_id", id);
  const { error } = await supabase.from("ledgers").delete().eq("id", id);
  if (error) throw error;
}

// ============ Transaction 相关 ============

export async function getTransactionsByLedger(
  ledgerId: string,
  month?: string
): Promise<Transaction[]> {
  const supabase = createClient();
  let query = supabase
    .from("transactions")
    .select("*")
    .eq("ledger_id", ledgerId);
  if (month) {
    query = query.like("date", `${month}%`);
  }
  const { data, error } = await query
    .order("date", { ascending: false })
    .order("time", { ascending: false });
  if (error) throw error;
  return data as Transaction[];
}

export async function getTransactionStats(
  ledgerId: string,
  month?: string
): Promise<TransactionStats> {
  const transactions = await getTransactionsByLedger(ledgerId, month);
  const stats: TransactionStats = { income: 0, expense: 0 };
  transactions.forEach((t) => {
    if (t.type === "income") {
      stats.income += t.amount;
    } else {
      stats.expense += t.amount;
    }
  });
  return stats;
}

export async function createTransaction(
  ledgerId: string,
  type: string,
  category: string,
  amount: number,
  remark: string,
  date: string,
  time: number
): Promise<Transaction> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      ledger_id: ledgerId,
      type,
      category,
      amount: parseFloat(String(amount)),
      remark: remark || "",
      date,
      time: parseInt(String(time)),
      sync_status: "synced",
    } as never)
    .select()
    .single();
  if (error) throw error;
  return data as Transaction;
}

export async function updateTransaction(
  id: string,
  type: string,
  category: string,
  amount: number,
  remark: string,
  date: string,
  time: number
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("transactions")
    .update({
      type,
      category,
      amount: parseFloat(String(amount)),
      remark: remark || "",
      date,
      time: parseInt(String(time)),
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

// ============ Sync 相关 ============

export async function getSyncRecord(userId: string): Promise<SyncRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sync_records")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data as SyncRecord | null;
}

export async function upsertSyncRecord(
  userId: string,
  lastSyncTime: string
): Promise<void> {
  const supabase = createClient();
  const existing = await getSyncRecord(userId);
  if (existing) {
    const { error } = await supabase
      .from("sync_records")
      .update({ last_sync_time: lastSyncTime } as never)
      .eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("sync_records")
      .insert({ user_id: userId, last_sync_time: lastSyncTime } as never);
    if (error) throw error;
  }
}

export async function getAllUserTransactions(
  userId: string
): Promise<{ ledgers: Ledger[]; transactions: Transaction[] }> {
  const ledgers = await getLedgersByUserId(userId);
  const ledgerIds = ledgers.map((l) => l.id);
  if (ledgerIds.length === 0) {
    return { ledgers, transactions: [] };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .in("ledger_id", ledgerIds);
  if (error) throw error;
  return { ledgers, transactions: data as Transaction[] };
}

// ============ Backup 相关 ============

export async function exportUserData(userId: string) {
  const { ledgers, transactions } = await getAllUserTransactions(userId);
  return {
    exportTime: new Date().toISOString(),
    userId,
    ledgers,
    transactions,
  };
}

export async function importUserData(
  userId: string,
  ledgers: Array<{ id?: string; name: string; description?: string }>,
  transactions: ClientTransaction[]
) {
  const ledgerMap: Record<string, string> = {};
  let successCount = 0;
  let skipCount = 0;

  // 导入账本
  for (const ledger of ledgers) {
    try {
      const existing = await getLedgersByUserId(userId);
      const found = existing.find((l) => l.name === ledger.name);
      if (found) {
        if (ledger.id) ledgerMap[ledger.id] = found.id;
        skipCount++;
      } else {
        const newLedger = await createLedger(
          userId,
          ledger.name,
          ledger.description || ""
        );
        if (ledger.id) ledgerMap[ledger.id] = newLedger.id;
        successCount++;
      }
    } catch {
      skipCount++;
    }
  }

  // 导入交易
  for (const trans of transactions) {
    try {
      const actualLedgerId =
        (trans.ledgerId && ledgerMap[trans.ledgerId]) || trans.ledgerId || "";
      if (!actualLedgerId) {
        skipCount++;
        continue;
      }
      const existing = await getTransactionsByLedger(actualLedgerId);
      const found = existing.find(
        (t) => t.date === trans.date && t.time === trans.time
      );
      if (found) {
        skipCount++;
      } else {
        await createTransaction(
          actualLedgerId,
          trans.type,
          trans.category,
          trans.amount,
          trans.remark,
          trans.date,
          trans.time
        );
        successCount++;
      }
    } catch {
      skipCount++;
    }
  }

  return { success: successCount, skip: skipCount };
}
