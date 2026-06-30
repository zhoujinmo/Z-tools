-- 排行榜查询函数：返回每个用户的历史最高分
-- 在数据库层面聚合，减少传输数据量

create or replace function public.get_leaderboard(limit_val int default 20)
returns table(username text, score int)
language sql
stable
as $$
  select
    gs.username,
    max(gs.score)::int as score
  from public.game_scores gs
  where gs.game_name = 'space-escape'
  group by gs.username
  order by score desc
  limit limit_val;
$$;
