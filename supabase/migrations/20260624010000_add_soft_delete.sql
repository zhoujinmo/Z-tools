-- 增量迁移：为已存在的transactions表添加逻辑删除字段
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_delete BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_by BIGINT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_transactions_is_delete ON transactions(is_delete);