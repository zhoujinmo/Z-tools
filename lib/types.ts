// 数据库实体类型定义

export interface User {
  id: string;
  username: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ledger {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export type TransactionType = "income" | "expense";
export type SyncStatus = "pending" | "synced" | "conflict";

export interface Transaction {
  id: string;
  ledger_id: string;
  type: TransactionType;
  category: string;
  amount: number;
  remark: string;
  date: string;
  time: number;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface SyncRecord {
  id: string;
  user_id: string;
  last_sync_time: string | null;
  sync_token: string | null;
  created_at: string;
}

// API 响应类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface TransactionStats {
  income: number;
  expense: number;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string | null;
}

// 前端使用的交易记录格式
export interface ClientTransaction {
  id?: string;
  ledgerId?: string;
  type: TransactionType;
  category: string;
  amount: number;
  remark: string;
  date: string;
  time: number;
}

// 游戏排行榜条目
export interface ScoreEntry {
  id: string;
  username: string;
  score: number;
  created_at: string;
}
