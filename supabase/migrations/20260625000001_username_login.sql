-- 补充：允许通过用户名查询邮箱（用于用户名登录）
-- profiles 表的 SELECT 对所有认证用户开放（用户名本身是公开的）

DROP POLICY IF EXISTS "用户可查看自己的资料" ON profiles;
CREATE POLICY "认证用户可查看 profiles" ON profiles FOR SELECT USING (true);
