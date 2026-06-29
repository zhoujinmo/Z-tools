# 星际币游戏内掉落 & 收集机制

## 摘要

将星际币从"赛后结算"改为"游戏内实时掉落收集"：星际币以金色发光球体形式随机出现在屏幕中，向下漂浮，玩家飞船碰到后立即 +1，伴随 "+1" 浮动文字的视觉反馈。

---

## 当前状态

- 星际币通过 `calculateCoins(score, isDailyFirst, level)` 在赛后结算时计算，非游戏内物品
- 无 Coin 实体类型，无 in-game 碰撞收集逻辑

---

## 变更设计

### 1. 新增 `Coin` 类型（types.ts）

```ts
export interface Coin {
  id: number;
  x: number;
  y: number;
  size: number;       // 默认 18
  speed: number;      // 0.5~1.5
  collected: boolean;
  twinklePhase: number; // 闪烁动画相位
}
```

### 2. 新增 `FloatText` 类型（types.ts）

```ts
/** 浮动文字特效（收集反馈 "+1"） */
export interface FloatText {
  x: number;
  y: number;
  text: string;
  life: number;       // 剩余帧数
  maxLife: number;    // 总帧数
}
```

### 3. GameStats 新增 `coinsCollected`（types.ts）

```ts
export interface GameStats {
  // ... 现有字段 ...
  coinsCollected: number;
}
```

### 4. entities.ts — 新增绘制函数

**`createCoin()`**：在屏幕顶部随机 x 位置生成，向下慢速飘落

**`drawCoin(ctx, coin)`**：金色圆形 + 内圈高光 + ⭐ 符号 + 外发光

**`drawFloatText(ctx, ft)`**："+1" 金色文字，向上飘动 + 淡出

### 5. engine.ts — 核心逻辑

| 新增/修改 | 说明 |
|-----------|------|
| `coins: Coin[]` | 当前活跃的星际币列表 |
| `collectedCoins: number` | 本局已收集数 |
| `floatTexts: FloatText[]` | 浮动文字特效队列 |
| `lastCoinSpawn: number` | 上次生成时间戳 |
| `spawnCoins(now)` | 每 3~5 秒随机生成一枚 |
| `updateCoins()` | 下落 + 碰撞检测 + 收集处理 + "+1" 特效 |
| `drawCoins()` | 渲染所有星际币 |
| `drawFloatTexts()` | 渲染所有浮动文字 |
| `render()` | 在陨石后、玩家前绘制星际币和浮动文字 |
| `drawHUD()` | 增加星际币计数显示 |
| `start()` | 重置 `coins`, `collectedCoins`, `floatTexts` |
| `gameOver()` | GameStats 传入 `coinsCollected` |

**碰撞检测**：简化圆形 vs AABB（玩家矩形），星际币半径约 9px，飞船宽 40×44。

**收集反馈流程**：
1. 检测碰撞 → `coin.collected = true`
2. `collectedCoins++`
3. `floatTexts.push({ x: coin.x, y: coin.y, text: "+1", life: 36, maxLife: 36 })`
4. 移除已收集的 coin
5. 浮动文字每帧 y -= 1, opacity = life/maxLife, 动画结束后移除

### 6. skins.ts — `settleGame` 修改

- 删除 `calculateCoins()` 调用
- 改为 `const coinsEarned = stats.coinsCollected`（本局收集的星际币）
- 保留每日首局 +30 和成就奖励

### 7. GameCanvas.tsx

- `GameStats` 类型扩展后自动适配，无需额外修改

---

## 涉及文件

| 文件 | 操作 |
|------|------|
| [types.ts](file:///c:/Users/USER/Documents/projects/demo/lib/game/types.ts) | 新增 `Coin`, `FloatText` 类型；`GameStats` 加 `coinsCollected` |
| [entities.ts](file:///c:/Users/USER/Documents/projects/demo/lib/game/entities.ts) | 新增 `createCoin`, `drawCoin`, `drawFloatText` |
| [engine.ts](file:///c:/Users/USER/Documents/projects/demo/lib/game/engine.ts) | 新增生币/收币/反馈全流程；修改 `start`, `render`, `gameOver`, `drawHUD` |
| [skins.ts](file:///c:/Users/USER/Documents/projects/demo/app/game/space-escape/skins.ts) | `settleGame` 用 `stats.coinsCollected` 替代 `calculateCoins` |

---

## 配置参数

| 参数 | 值 | 说明 |
|------|-----|------|
| 星际币大小 | 18px | 直径 |
| 生成间隔 | 3~5秒 | 随机 |
| 下落速度 | 0.5~1.5 px/帧 | 比陨石慢 |
| 碰撞半径 | 9px | 圆形碰撞 |
| "+1" 浮动时长 | 36 帧 | ~0.6秒@60fps |
| "+1" 浮动距离 | ~36px | 向上 |

---

## 决策

1. 星际币与陨石不碰撞（互不影响），只与玩家碰撞
2. 星际币到达屏幕底部后消失（不扣分不计数）
3. 每日首局+30 和成就+50 的奖励仍然保留在赛后结算中
4. 浮动文字使用简单 Canvas 绘制，不引入 DOM overlay，保证性能
5. 星际币绘制顺序：在陨石之后、玩家之前，确保不被遮挡

---

## 验证

1. `npm run dev`，进入游戏
2. 观察星际币每隔几秒从顶部随机位置生成并下落
3. 操控飞船碰到星际币时：星际币消失、"+1" 浮动文字出现并淡出、HUD 计数 +1
4. 游戏结束后检查结算面板显示本局收集的星际币数量
5. 检查皮肤选择页星际币余额正确累加
