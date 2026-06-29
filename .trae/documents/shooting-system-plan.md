# 泰坦攻击系统实现计划

## 摘要

为太空逃亡游戏添加射击功能：玩家按空格/触屏射击按钮发射子弹，子弹向上移动，击中陨石后触发爆炸效果并销毁陨石，陨石被摧毁时获得分数。

---

## 当前状态

- 游戏是纯躲避型，玩家只能移动飞船避开陨石
- 碰撞检测有两种：AABB（默认）和像素级（有皮肤图片时）
- 无子弹、无爆炸、无射击输入
- 画布 800×600，玩家宽 40 高 44，移动速度 5px/帧

---

## 涉及文件

| 文件 | 改动 |
|------|------|
| [types.ts](file:///c:/Users/USER/Documents/projects/demo/lib/game/types.ts) | 新增 `Bullet`, `Explosion`, `Particle` 类型；扩展 `KeyState` |
| [entities.ts](file:///c:/Users/USER/Documents/projects/demo/lib/game/entities.ts) | 新增 `createBullet`, `drawBullet`, `createExplosion`, `drawExplosion`, `checkBulletAsteroidCollision` |
| [engine.ts](file:///c:/Users\USER/Documents/projects/demo/lib/game/engine.ts) | 新增子弹/爆炸数组，射击逻辑，更新/渲染循环，爆炸时加分 |
| [GameCanvas.tsx](file:///c:/Users/USER/Documents/projects/demo/app/game/space-escape/GameCanvas.tsx) | 添加空格键监听 + 移动端射击按钮 |

---

## 详细设计

### 1. 新增类型（types.ts）

```ts
/** 子弹 */
export interface Bullet {
  id: number;
  x: number;       // 左上角 x
  y: number;       // 左上角 y
  width: number;   // 6
  height: number;  // 14
  speed: number;   // 10 px/帧（向上）
}

/** 爆炸粒子 */
export interface Particle {
  x: number;
  y: number;
  vx: number;      // 速度分量
  vy: number;
  life: number;     // 剩余帧数
  maxLife: number;
  color: string;
  size: number;     // 初始大小
}

/** 爆炸效果（包含多个粒子） */
export interface Explosion {
  id: number;
  x: number;
  y: number;
  particles: Particle[];
}
```

扩展 `KeyState`：
```ts
export interface KeyState {
  ArrowUp: boolean;
  ArrowDown: boolean;
  ArrowLeft: boolean;
  ArrowRight: boolean;
  Space: boolean;  // 新增
}
```

### 2. 新增实体函数（entities.ts）

**`createBullet(player)`**：在飞船顶部中心生成子弹
- 位置：`(player.x + player.width/2 - 3, player.y - 14)`
- 尺寸：6×14
- 速度：10 px/帧

**`drawBullet(ctx, bullet)`**：绘制子弹
- 青蓝色渐变矩形（`#22d3ee` → `#0ea5e9`）
- 外发光效果（`shadowBlur`）
- 白色高光线

**`createExplosion(x, y, palette)`**：在指定位置生成爆炸
- 生成 10 个粒子
- 每个粒子随机方向（`angle = random(0, 2π)`，`speed = random(1, 4)`）
- 粒子颜色从陨石调色板中随机选取
- 生命值 25-40 帧

**`drawExplosion(ctx, explosion)`**：绘制爆炸粒子
- 每个粒子为圆形，大小随生命值衰减
- 透明度随生命值衰减

**`checkBulletAsteroidCollision(bullet, asteroid)`**：圆形 vs 矩形碰撞
- 子弹视为圆形（半径 `width/2`）
- 陨石视为圆形（半径 `size/2`）
- 圆心距 < 半径和即碰撞

### 3. 引擎集成（engine.ts）

**新字段**：
```ts
private bullets: Bullet[] = [];
private explosions: Explosion[] = [];
private lastShootTime = 0;
private shootCooldown = 150; // 毫秒，约 4 发/秒
```

**射击逻辑**（`tryShoot(now)`）：
- 检查 `keys.Space === true`
- 检查 `now - lastShootTime > shootCooldown`
- 检查 `bullets.length < 20`（最大同屏子弹数）
- 满足条件则 `createBullet(player)` 并更新 `lastShootTime`

**子弹更新**（`updateBullets()`）：
- 每帧 `bullet.y -= bullet.speed`
- 移除 `bullet.y < -bullet.height`（出屏）的子弹

**子弹-陨石碰撞**：
- 在 `updateAsteroids()` 中增加逻辑
- 遍历存活子弹，对每个陨石检查 `checkBulletAsteroidCollision`
- 碰撞时：子弹标记移除，陨石标记移除，生成爆炸，分数 +10

**爆炸更新**（`updateExplosions()`）：
- 每帧更新粒子位置（`x += vx, y += vy`）
- 减小粒子大小，递减生命值
- 移除生命值为 0 的粒子
- 移除无粒子的爆炸

**渲染顺序**更新：
1. 背景
2. 陨石
3. 星际币
4. **爆炸效果**
5. **子弹**
6. 浮动文字
7. 玩家
8. HUD

**start()/reset()** 清空子弹和爆炸数组。

### 4. UI 层（GameCanvas.tsx）

**键盘**：在 `validKeys` 中添加 `"Space"`，转发到 `engine.setKey("Space", pressed)`

**移动端**：在虚拟方向键下方添加射击按钮
- 圆形按钮，红色/橙色主题
- 文案 "🔥" 或 "FIRE"
- `onTouchStart` → `setKey("Space", true)`
- `onTouchEnd` → `setKey("Space", false)`
- 仅在 `isMobile && isPlaying` 时显示

---

## 性能保障

| 措施 | 说明 |
|------|------|
| 子弹上限 | 同屏最多 20 发 |
| 出屏回收 | 子弹出屏立即移除 |
| 粒子池 | 爆炸粒子生命值耗尽自动回收 |
| 碰撞优化 | 子弹用简单圆-圆碰撞（非像素级） |
| 内存控制 | 爆炸数组仅保留活跃效果 |

---

## 验证

1. `npm run dev` → 进入游戏
2. 按住空格键：飞船连续发射子弹，子弹向上飞行
3. 子弹击中陨石：陨石爆炸消失，+10 分
4. 子弹出屏自动消失
5. 爆炸粒子动画自然消散
6. 移动端射击按钮正常工作
7. 性能流畅，无卡顿
