-- Supabase 数据库初始化脚本（适配Supabase Auth版本）
-- 在 Supabase Dashboard > SQL Editor 中执行此脚本

-- 用户表（适配Supabase Auth）
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    auth_id UUID UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 账本表
CREATE TABLE IF NOT EXISTS ledgers (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- 交易记录表（含逻辑删除）
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    ledger_id BIGINT NOT NULL REFERENCES ledgers(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    remark TEXT DEFAULT '',
    date TEXT NOT NULL,
    time BIGINT NOT NULL,
    sync_status TEXT DEFAULT 'pending',
    is_delete BOOLEAN DEFAULT false,
    deleted_by BIGINT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 同步记录表
CREATE TABLE IF NOT EXISTS sync_records (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_sync_time TIMESTAMPTZ,
    sync_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_transactions_ledger_id ON transactions(ledger_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_ledgers_user_id ON ledgers(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_is_delete ON transactions(is_delete);

-- 启用 Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_records ENABLE ROW LEVEL SECURITY;

-- 允许匿名访问（认证由Supabase Auth处理）
CREATE POLICY "Allow all access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON ledgers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON sync_records FOR ALL USING (true) WITH CHECK (true);