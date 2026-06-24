-- Next.js + Supabase Auth 迁移脚本
-- 将认证从自实现 JWT 迁移到 Supabase Auth

-- 1. 创建 profiles 表（存储用户名，关联 Supabase Auth 用户）
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 备份旧数据（如果存在旧 users 表）
-- 注意：由于 user_id 从 INTEGER 变为 UUID，旧数据无法直接迁移
-- 如需保留旧数据，请先手动导出

-- 3. 重建 ledgers 表（使用 UUID user_id）
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS sync_records;
DROP TABLE IF EXISTS ledgers;
DROP TABLE IF EXISTS users;

CREATE TABLE ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- 4. 重建 transactions 表
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ledger_id UUID NOT NULL REFERENCES ledgers(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    remark TEXT DEFAULT '',
    date TEXT NOT NULL,
    time BIGINT NOT NULL,
    sync_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 重建 sync_records 表
CREATE TABLE sync_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_sync_time TIMESTAMPTZ,
    sync_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 索引
CREATE INDEX IF NOT EXISTS idx_transactions_ledger_id ON transactions(ledger_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_ledgers_user_id ON ledgers(user_id);

-- 7. 启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_records ENABLE ROW LEVEL SECURITY;

-- 8. RLS 策略：用户只能访问自己的数据
CREATE POLICY "用户可查看自己的资料" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "用户可更新自己的资料" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "用户可创建自己的资料" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "用户可查看自己的账本" ON ledgers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "用户可创建账本" ON ledgers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "用户可更新自己的账本" ON ledgers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "用户可删除自己的账本" ON ledgers FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "用户可查看自己账本的交易" ON transactions FOR SELECT USING (
    EXISTS (SELECT 1 FROM ledgers WHERE ledgers.id = transactions.ledger_id AND ledgers.user_id = auth.uid())
);
CREATE POLICY "用户可创建交易" ON transactions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM ledgers WHERE ledgers.id = transactions.ledger_id AND ledgers.user_id = auth.uid())
);
CREATE POLICY "用户可更新自己的交易" ON transactions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM ledgers WHERE ledgers.id = transactions.ledger_id AND ledgers.user_id = auth.uid())
);
CREATE POLICY "用户可删除自己的交易" ON transactions FOR DELETE USING (
    EXISTS (SELECT 1 FROM ledgers WHERE ledgers.id = transactions.ledger_id AND ledgers.user_id = auth.uid())
);

CREATE POLICY "用户可查看自己的同步记录" ON sync_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "用户可创建同步记录" ON sync_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "用户可更新自己的同步记录" ON sync_records FOR UPDATE USING (auth.uid() = user_id);

-- 9. 自动创建 profile 的触发器（当 auth.users 有新用户时）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. updated_at 自动更新触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER ledgers_updated_at BEFORE UPDATE ON ledgers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
