# 皮肤解锁系统全面优化计划

## 摘要

将当前单一的「阈值解锁」系统升级为多层级的综合解锁体系，引入：
- **4 级稀有度**（普通/稀有/史诗/传说）
- **3 种解锁途径**（阈值解锁、成就解锁、碎片合成）
- **星际币货币** + **碎片收集** 经济系统
- **Supabase 服务端持久化** 跨设备同步进度

---

## 当前状态分析

### 现状
| 方面 | 当前实现 |
|------|---------|
| 皮肤数量 | 13 个（1 默认 + 12 可解锁） |
| 解锁方式 | 单一统计阈值（总分数/总局数/最高等级/最大连躲） |
| 稀有度 | 无区分 |
| 存储 | 仅 localStorage |
| 货币 | 无 |
| 进度数据 | `totalScore`, `totalGames`, `maxLevel`, `maxConsecutiveDodges`, `unlockedSkinIds` |

### 关键文件
| 文件 | 角色 |
|------|------|
| [app/game/space-escape/skins.ts](file:///c:/Users/USER/Documents/projects/demo/app/game/space-escape/skins.ts) | 皮肤定义 + 解锁检查 + 进度存储 |
| [app/game/space-escape/skin-select/page.tsx](file:///c:/Users/USER/Documents/projects/demo/app/game/space-escape/skin-select/page.tsx) | 皮肤选择 UI |
| [app/game/space-escape/GameCanvas.tsx](file:///c:/Users/USER/Documents/projects/demo/app/game/space-escape/GameCanvas.tsx) | 游戏结束处理 |
| [lib/game/types.ts](file:///c:/Users/USER/Documents/projects/demo/lib/game/types.ts) | 类型定义 |
| [lib/game/engine.ts](file:///c:/Users/USER/Documents/projects/demo/lib/game/engine.ts) | 引擎，提供 `GameStats` |
| [app/api/game/scores/route.ts](file:///c:/Users/USER/Documents/projects/demo/app/api/game/scores/route.ts) | Supabase 分数提交 |
| [lib/supabase/client.ts](file:///c:/Users/USER/Documents/projects/demo/lib/supabase/client.ts) | Supabase 浏览器客户端 |

---

## 新系统设计

### 1. 稀有度体系

| 稀有度 | 标签 | 皮肤数 | 解锁方式 |
|--------|------|--------|---------|
| **普通** Common | ⭐ | 4 | 单阈值解锁（总场次、总分数） |
| **稀有** Rare | ⭐⭐ | 5 | 复合条件 / 特定成就 |
| **史诗** Epic | ⭐⭐⭐ | 2 | 高难度成就（AND 多条件） |
| **传说** Legendary | ⭐⭐⭐⭐ | 1 | 碎片合成（10 碎片） |

### 2. 解锁途径

#### 途径 A：阈值解锁（普通皮肤）
与当前类似但提高门槛：
- 深绿守护者：完成 10 次游戏（原 5）
- 沙漠风暴：累计获得 2000 分（原 1000）
- 紫翼巡航者：达到等级 8（原 5）
- 翠绿突袭者：累计获得 4000 分（原 2000）

#### 途径 B：成就解锁（稀有皮肤）
新增成就追踪系统，达成特定成就解锁：

| 成就 ID | 名称 | 条件 | 解锁皮肤 |
|---------|------|------|---------|
| `dodge-master` | 闪避大师 | 单局连续躲过 40 颗陨石 | 青锋战机 |
| `level-champion` | 等级达人 | 单局达到等级 12 | 暗夜魅影 |
| `score-hunter` | 分数猎手 | 单局获得 800 分 | 紫晶幻影 |
| `veteran` | 身经百战 | 累计完成 30 局游戏 | 冰蓝战机 |
| `wealthy` | 富甲一方 | 累计获得总分数 8000 | 橙色彗星 |

#### 途径 C：复合条件（史诗皮肤）
需同时满足多个条件：
- **洋红烈焰**：单局达到等级 15 **且** 累计总分数 ≥ 12000
- **金色猎鹰**：累计完成 50 局 **且** 单局最高连续躲过 ≥ 50

#### 途径 D：碎片合成（传说皮肤）
- **青铜泰坦**：需要 10 个「泰坦碎片 (titan-shard)」
- 碎片来源：
  - 每局游戏随机掉落 0-3 个（分数越高概率越大）
  - 成就里程碑奖励（每达成 3 个成就 → 2 碎片）
  - 星际币兑换：100 星际币 = 1 碎片

### 3. 星际币（Stellar Coins）货币系统

| 获取途径 | 数量 |
|---------|------|
| 每局游戏基础奖励 | `floor(score / 10)` 枚 |
| 每日首局加成 | +30 枚 |
| 成就达成 | +50 枚/个 |
| 等级里程碑（每 5 级） | +100 枚 |

| 消耗途径 | 价格 |
|---------|------|
| 兑换碎片 | 100 币 = 1 碎片 |
| 兑换普通皮肤 | 500 币 |

### 4. 服务端持久化（Supabase）

#### 新建表 `game_progress`
```sql
CREATE TABLE game_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
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
```

#### 同步策略
- 登录后从 Supabase 拉取进度，与 localStorage 合并（取最大值）
- 每局结束后上传进度
- 离线/游客模式仍使用 localStorage
- 皮肤选择和进度在未登录时正常运行

---

## 实现步骤

### Step 1：[types.ts](file:///c:/Users/USER/Documents/projects/demo/lib/game/types.ts) — 扩展类型定义

新增：
```ts
export type SkinRarity = "common" | "rare" | "epic" | "legendary";

export interface SkinFragment {
  fragmentId: string;    // e.g. "titan-shard"
  skinId: string;        // target skin
  count: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
}

export interface GameProgress {
  totalScore: number;
  totalGames: number;
  maxLevel: number;
  maxConsecutiveDodges: number;
  stellarCoins: number;
  unlockedSkinIds: string[];
  skinFragments: Record<string, number>;
  achievements: string[];  // achieved achievement IDs
  lastDailyBonusDate: string;
}
```

扩展 `SkinStyle`：
```ts
export interface SkinStyle {
  // ... 现有字段 ...
  rarity: SkinRarity;
  /** 解锁方法描述 */
  unlockMethods: UnlockMethod[];
}
```

### Step 2：[lib/game/engine.ts](file:///c:/Users/USER/Documents/projects/demo/lib/game/engine.ts) — 扩展 GameStats

在 `GameStats` 中新增 `asteroidsDodged`（本局躲过陨石数），方便成就追踪。

### Step 3：[app/game/space-escape/skins.ts](file:///c:/Users/USER/Documents/projects/demo/app/game/space-escape/skins.ts) — 核心重写

- 重定义全部 13 个皮肤：分配稀有度、新的解锁条件、解锁方法描述
- 新增成就定义列表 `ACHIEVEMENTS`
- 新增 `UnlockMethod` 类型（阈值/成就/碎片）
- 新增星际币计算函数 `calculateCoins(score, isDailyFirst, stats)`
- 新增碎片掉落函数 `calculateFragmentDrops(score, level)`
- 新增成就检查函数 `checkAchievements(progress, stats)`
- 新增 `GameProgress` 的读写函数（localStorage + Supabase）
- 新增进度合并函数 `mergeProgress(local, server)`

### Step 4：[app/api/game/progress/route.ts](file:///c:/Users/USER/Documents/projects/demo/app/api/game/progress/route.ts) — 新建 API

- `GET`：获取用户进度（需登录）
- `POST`：上传/更新用户进度（需登录）

### Step 5：[app/api/game/fragments/exchange/route.ts](file:///c:/Users/USER/Documents/projects/demo/app/api/game/fragments/exchange/route.ts) — 新建 API

- `POST`：星际币兑换碎片（需登录）

### Step 6：[app/game/space-escape/GameCanvas.tsx](file:///c:/Users/USER/Documents/projects/demo/app/game/space-escape/GameCanvas.tsx) — 游戏结束流程升级

- 调用引擎的 `GameStats`（含 asteroidsDodged）
- 计算星际币奖励 + 碎片掉落
- 检查成就解锁
- 弹出奖励汇总（货币、碎片、解锁皮肤/成就）
- 同步进度到 Supabase（登录用户）
- 保留 localStorage 回退

### Step 7：[app/game/space-escape/skin-select/page.tsx](file:///c:/Users/USER/Documents/projects/demo/app/game/space-escape/skin-select/page.tsx) — UI 升级

- 显示稀有度标签（⭐ 标识）
- 显示每个皮肤的解锁方式详情
- 传说皮肤显示碎片收集进度（X/10）
- 增加「碎片兑换」入口和星际币余额显示
- 锁定皮肤显示具体解锁条件而非简单的 `unlockCondition` 文字

### Step 8：Supabase 数据库迁移

执行 SQL 创建 `game_progress` 表。（提供 SQL 文件供手动执行）

---

## 涉及文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| [lib/game/types.ts](file:///c:/Users/USER/Documents/projects/demo/lib/game/types.ts) | 编辑 | 新增 SkinRarity, Achievement, GameProgress, 扩展 SkinStyle |
| [lib/game/engine.ts](file:///c:/Users/USER/Documents/projects/demo/lib/game/engine.ts) | 编辑 | GameStats 增加 asteroidsDodged |
| [app/game/space-escape/skins.ts](file:///c:/Users/USER/Documents/projects/demo/app/game/space-escape/skins.ts) | 重写 | 皮肤重定义 + 成就 + 货币 + 碎片 + 双存储 |
| **`app/api/game/progress/route.ts`** | **新建** | Supabase 进度 API |
| **`app/api/game/fragments/exchange/route.ts`** | **新建** | 碎片兑换 API |
| [app/game/space-escape/GameCanvas.tsx](file:///c:/Users/USER/Documents/projects/demo/app/game/space-escape/GameCanvas.tsx) | 编辑 | 游戏结束逻辑升级 |
| [app/game/space-escape/skin-select/page.tsx](file:///c:/Users/USER/Documents/projects/demo/app/game/space-escape/skin-select/page.tsx) | 编辑 | UI 升级 |

---

## 决策

1. **难度平衡**：普通皮肤门槛提升 1.5-2x，稀有需特定成就，史诗需多条件，传说需肝碎片。总体难度提升但渐进式，避免初期挫败感
2. **星际币产出速率**：平均每局约 10-80 币（随分数波动），传说皮肤等价于 ~1000 币或 10 次高分局，保持长期动力
3. **离线兼容**：localStorage 始终作为主存储，Supabase 作为备份同步，未登录用户不受影响
4. **不实现限时活动/排名系统**：这两项需要额外的定时任务或赛季机制，超出当前范围。成就系统已提供足够的多样性
5. **SQL 迁移**：提供 SQL 文件手动执行，不在代码中自动创建表

---

## 验证

1. 执行 SQL 创建 `game_progress` 表
2. `npm run dev`，访问 `/game/space-escape`
3. 玩几局后检查：星际币增加、碎片掉落提示、普通皮肤在高门槛时正常上锁
4. 检查成就追踪（闪避大师、等级达人等）是否正确触发
5. 登录后检查 Supabase 同步是否正常
6. 皮肤选择页确认稀有度标识和碎片进度显示
7. 星际币兑换碎片功能正常
