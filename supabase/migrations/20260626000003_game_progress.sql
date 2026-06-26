-- 游戏进度表：存储太空逃亡的皮肤解锁、货币、碎片、成就等持久化数据
-- 与 game_progress.sql 内容一致，但使用正确的迁移时间戳命名

CREATE TABLE IF NOT EXISTS game_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_score INT DEFAULT 0,
  total_games INT DEFAULT 0,
  max_level INT DEFAULT 0,
  max_consecutive_dodges INT DEFAULT 0,
  stellar_coins INT DEFAULT 0,
  unlocked_skin_ids JSONB DEFAULT '["default"]'::jsonb,
  skin_fragments JSONB DEFAULT '{}'::jsonb,
  achievements JSONB DEFAULT '[]'::jsonb,
  last_daily_bonus_date TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引：按更新时间排序
CREATE INDEX IF NOT EXISTS idx_game_progress_updated_at ON game_progress (updated_at);

-- RLS 策略：用户只能读写自己的进度
ALTER TABLE game_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own progress"
  ON game_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON game_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON game_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
  ON game_progress FOR DELETE
  USING (auth.uid() = user_id);
