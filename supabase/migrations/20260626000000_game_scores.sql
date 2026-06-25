-- 太空逃亡游戏排行榜表
-- 用于存储玩家游戏分数，支持全球排行榜功能

create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  username text not null,
  score integer not null check (score >= 0),
  game_name text not null default 'space-escape',
  created_at timestamptz not null default now()
);

-- 按分数降序查询的索引
create index if not exists idx_game_scores_score_desc
  on public.game_scores (game_name, score desc);

-- 按用户查询的索引
create index if not exists idx_game_scores_user
  on public.game_scores (user_id);

-- 启用行级安全
alter table public.game_scores enable row level security;

-- 所有已认证用户可查看排行榜
create policy "已认证用户可查看排行榜"
  on public.game_scores for select
  to authenticated
  using (true);

-- 已认证用户只能插入自己的分数
create policy "用户可提交自己的分数"
  on public.game_scores for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 用户只能删除自己的分数
create policy "用户可删除自己的分数"
  on public.game_scores for delete
  to authenticated
  using (auth.uid() = user_id);
