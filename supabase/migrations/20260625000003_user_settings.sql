-- 添加用户设置 JSONB 列（预算、自定义分类等）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- 允许用户更新自己的 settings
DROP POLICY IF EXISTS "认证用户可查看 profiles" ON profiles;
CREATE POLICY "认证用户可查看 profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "用户可更新自己的 settings" ON profiles FOR UPDATE USING (auth.uid() = id);
