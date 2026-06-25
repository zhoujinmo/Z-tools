-- 切换到Supabase Auth认证模式
-- 移除users表的password字段，使用Supabase Auth管理用户认证

-- 添加Supabase Auth扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 更新users表：移除password字段，添加auth_id关联Supabase Auth
ALTER TABLE users DROP COLUMN IF EXISTS password;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;

-- 创建profiles表（用于存储用户扩展信息，与Supabase Auth同步）
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- 启用RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 创建策略：认证用户可查看profiles
CREATE POLICY "认证用户可查看profiles" ON profiles FOR SELECT USING (true);

-- 创建触发器：用户创建时自动同步到profiles表
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 允许存储过程访问auth.users表
GRANT SELECT ON auth.users TO PUBLIC;

-- 创建存储过程：更新用户名
CREATE OR REPLACE FUNCTION public.update_username(p_id UUID, p_username TEXT)
RETURNS void AS $$
BEGIN
    UPDATE profiles SET username = p_username WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;