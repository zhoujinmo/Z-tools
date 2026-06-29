# 陨石形状多样化 & 背景对比度修复

## 摘要

两个改进方向：
1. **形状多样化**：参考真实陨石形态（不规则碎片、烧蚀圆润、棱角分明、拉长定向、扁平等），用不同顶点策略生成多样化轮廓，并添加 regmaglypts（气印凹坑）
2. **颜色对比修复**：当前部分调色板暗面与深空背景（`#020617` / `#0f172a` / `#1e1b4b`）几乎同化，需要整体提亮所有调色板，确保暗面最低亮度与背景有明显区分

---

## 当前状态分析

### 背景色（`drawBackground()` entities.ts:243-248）
| 位置 | 色值 | RGB |
|------|------|-----|
| 顶部 | `#020617` | (2, 6, 23) |
| 中部 | `#0f172a` | (15, 23, 42) |
| 底部 | `#1e1b4b` | (30, 27, 75) |

背景是**极深蓝/靛色调**，RGB 通道值在 2-75 范围。

### 当前调色板问题颜色

| 调色板 | 暗面 | 问题 |
|--------|------|------|
| `["#3a3a3a","#202020","#0f0f0f"]` | `#0f0f0f` | RGB(15,15,15)，与 `#0f172a`(15,23,42) 亮度几乎一致 |
| `["#3d3d3d","#262626","#141414"]` | `#141414` | RGB(20,20,20)，与顶部背景 `#020617`(2,6,23) 明度接近 |
| `["#4a4a4a","#2d2d2d","#1a1a1a"]` | `#1a1a1a` | 勉强可辨，但边缘模糊 |
| `["#3d4a35","#263020","#141a10"]` | `#141a10` | 极暗绿，几乎淹没 |
| `["#4a5540","#2d3528","#1a2015"]` | `#1a2015` | 极暗，对比不足 |

### 当前形状问题

仅有一种形状策略：固定 8 顶点 + 随机偏移 0.7-1.1。虽然偏移量带来一定的凹凸变化，但所有陨石"看起来"属于同一形态类型，缺乏真实陨石的形态多样性。

---

## 真实陨石形态参考（USGS, NASA, USask）

| 形态类型 | 成因 | 视觉特征 |
|---------|------|---------|
| **不规则碎片** | 大气层中碎裂 | 棱角分明，边缘锐利，形状像碎片/弹片 |
| **烧蚀圆润** | 表面高温熔融 | 边角被削圆，整体偏圆/椭圆，表面光滑 |
| **气印坑 (regmaglypts)** | 气流冲击 | 表面有拇指状凹坑，铁陨石尤其明显 |
| **定向拉长** | 单面烧蚀 | 呈拉长/子弹状，有明显的前端和后端 |
| **扁平状** | 碎裂 + 烧蚀 | 一个轴明显压扁，呈盘状 |

---

## 提议变更

### 变更 1：`types.ts` — 扩展 `Asteroid` 接口

新增 `shapeType: number` 字段：

```ts
export interface Asteroid {
  // ... 现有字段 ...
  /** 颜色调色板索引 */
  palette: number;
  /** 形态类型：0=不规则碎片, 1=烧蚀圆润, 2=棱角碎片, 3=拉长型, 4=扁平型 */
  shapeType: number;
}
```

### 变更 2：`entities.ts` — 替换 ASTEROID_PALETTES（全部提亮）

所有暗面色值至少达到 RGB 通道 ≥ 40，确保与背景对比度。

```ts
const ASTEROID_PALETTES: [string, string, string][] = [
  // 新鲜熔壳 - 石陨石 (深灰黑系)
  ["#6b6b6b", "#4a4a4a", "#2d2d2d"],
  ["#5c5c5c", "#3d3d3d", "#262626"],
  // 风化铁陨石 - 锈色系
  ["#a07828", "#7a5520", "#4a3512"],
  ["#b06a44", "#8b4a2e", "#5c301c"],
  // 球粒陨石 - 浅灰带褐
  ["#b8b0a0", "#908878", "#6b6355"],
  ["#c0b8a8", "#9e9682", "#706858"],
  // 碳质陨石 - 深炭灰
  ["#555555", "#3a3a3a", "#282828"],
  // 橄榄陨石 - 暗绿棕 (铁+橄榄石)
  ["#6b755a", "#4a5538", "#323d25"],
  // 玻璃陨石 - 深绿褐
  ["#5c6b4a", "#3d4a30", "#283220"],
];
```

> 提亮幅度：暗面从 ~#0f-#1a 提升到 #26-#32 区间，确保与背景（最亮 #1e1b4b）有 ≥ 10 的 RGB 差值。

### 变更 3：`entities.ts` — `createAsteroid()` 新增形状生成逻辑

替换固定 8 顶点的生成方式，根据 `shapeType` 生成不同顶点分布：

```ts
const shapeType = Math.floor(Math.random() * 5); // 0-4
let vertexCount: number;
let vertices: number[];

switch (shapeType) {
  case 0: // 不规则碎片 - 当前默认样式
    vertexCount = 8;
    vertices = Array.from({ length: vertexCount }, () => rand(0.68, 1.15));
    break;
  case 1: // 烧蚀圆润 - 更多顶点 + 窄幅度，近圆形带轻微起伏
    vertexCount = 12;
    vertices = Array.from({ length: vertexCount }, () => rand(0.88, 1.06));
    break;
  case 2: // 棱角碎片 - 少顶点 + 宽幅度，尖锐不规则
    vertexCount = rand(5, 7) | 0;
    vertices = Array.from({ length: vertexCount }, () => rand(0.55, 1.2));
    break;
  case 3: // 拉长型 - 沿 Y 轴拉伸
    vertexCount = 8;
    vertices = Array.from({ length: vertexCount }, () => rand(0.7, 1.1));
    break;
  case 4: // 扁平型 - 沿 X 轴压缩
    vertexCount = 8;
    vertices = Array.from({ length: vertexCount }, () => rand(0.7, 1.1));
    break;
}
```

返回时附加 `shapeType`。

### 变更 4：`entities.ts` — `drawAsteroid()` 修改

#### 4a. 形状绘制
- 类型 3（拉长型）：Y 轴缩放 `scale(1, 1.4)` 使陨石竖直拉长
- 类型 4（扁平型）：Y 轴缩放 `scale(1, 0.6)` 使陨石横向扁平

#### 4b. 新增 regmaglypts（气印坑）

为避免每帧随机生成导致闪动，在 `Asteroid` 接口和 `createAsteroid()` 中预生成气印参数：

**`types.ts` 新增字段：**
```ts
/** 气印凹坑参数 [角度, 距中心距离, 半径]，null 表示无气印 */
regmaglypts: { angle: number; dist: number; r: number }[] | null;
```

**`createAsteroid()` 中预生成：**
```ts
// 气印坑 - 类型 0（不规则）和类型 1（圆润）有概率生成
let regmaglypts: { angle: number; dist: number; r: number }[] | null = null;
if (shapeType <= 1 && Math.random() < 0.6) {
  const pitCount = Math.floor(rand(1, 4));
  regmaglypts = [];
  for (let p = 0; p < pitCount; p++) {
    regmaglypts.push({
      angle: rand(0, Math.PI * 2),
      dist: rand(size * 0.08, size * 0.35),
      r: rand(size * 0.03, size * 0.07),
    });
  }
}
```

**`drawAsteroid()` 中绘制：**
```ts
// 气印坑（regmaglypts）
if (asteroid.regmaglypts) {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  for (const pit of asteroid.regmaglypts) {
    ctx.beginPath();
    ctx.arc(
      Math.cos(pit.angle) * pit.dist,
      Math.sin(pit.angle) * pit.dist,
      pit.r, 0, Math.PI * 2
    );
    ctx.fill();
  }
}
```

### 变更 5：同步更新 `engine.ts` 中碰撞检测（如需要）

碰撞检测使用 AABB 包围盒（`asteroid.size × asteroid.size`），`shapeType` 和加宽/拉长不影响包围盒尺寸，无需修改。

---

## 涉及文件清单

| 文件 | 操作 |
|------|------|
| [types.ts](file:///c:/Users/USER/Documents/projects/demo/lib/game/types.ts) | 添加 `shapeType: number` 字段 |
| [entities.ts](file:///c:/Users/USER/Documents/projects/demo/lib/game/entities.ts) | 替换调色板颜色（全部提亮）、重写顶点生成逻辑、修改 drawAsteroid |

---

## 假设 & 决策

1. 调色板暗面最低 RGB 通道 ≥ 35，比背景最亮处（RGB 30-75 但蓝色通道偏高）至少提高 10+ 有效感知亮度差异
2. 形状类型均匀随机（各 20%），真实陨石分布不均但游戏性优先
3. regmaglypts 的随机性在每帧绘制时用 `Math.random()` 计算——但因为是每帧重绘，会导致闪动。解决方案：在 `createAsteroid()` 中预生成 pit 参数存入 `Asteroid`，或使用确定性伪随机。这里采用 **预生成** 方式，在 `Asteroid` 接口中存 `regmaglypts?: {angle: number; dist: number; r: number}[]`
4. 拉长/扁平通过 Canvas `scale()` 变换实现，不影响碰撞检测包围盒

---

## 验证

1. `npm run dev` → 访问 `/game/space-escape`
2. 观察陨石是否呈现不同轮廓：圆形/棱角/拉长/扁平
3. 确认所有陨石颜色在深空背景下清晰可见
4. 确认气印坑（regmaglypts）出现在部分陨石表面
5.