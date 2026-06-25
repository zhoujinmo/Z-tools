-- ============================================
-- 一键修复：允许 profiles.username 为空
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================

-- 1. 移除 NOT NULL 约束
ALTER TABLE profiles ALTER COLUMN username DROP NOT NULL;

-- 2. 删除旧的 UNIQUE 约束
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_username_key;

-- 3. 创建部分唯一索引（仅非空值检查唯一性）
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
    ON profiles (username)
    WHERE username IS NOT NULL;

-- 4. 修复触发器：从 raw_user_meta_data 中提取 username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.email
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 清除之前触发器失败产生的孤儿用户
DELETE FROM auth.users
WHERE id IN (
    SELECT u.id FROM auth.users u
    LEFT JOIN profiles p ON p.id = u.id
    WHERE p.id IS NULL
      AND u.email LIKE '%@example.com'
);
