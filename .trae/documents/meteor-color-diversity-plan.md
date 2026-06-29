# 陨石颜色多样化计划

## 摘要

根据真实陨石颜色参考，为游戏中的陨石添加随机颜色多样性。当前所有陨石都是硬编码的灰色调，将通过引入多套基于真实陨石的颜色调色板（palette），并在陨石创建时随机分配，使每颗陨石呈现不同的真实陨石外观。

---

## 当前状态分析

### 现有代码位置

| 文件 | 相关部分 |
|------|----------|
| [types.ts](file:///c:/Users/USER/Documents/projects/demo/lib/game/types.ts#L25-L40) | `Asteroid` 接口定义，无颜色字段 |
| [entities.ts](file:///c:/Users/USER/Documents/projects/demo/lib/game/entities.ts#L97-L124) | `createAsteroid()` 创建函数，不生成颜色 |
| [entities.ts](file:///c:/Users/USER/Documents/projects/demo/lib/game/entities.ts#L127-L192) | `drawAsteroid()` 绘制函数，硬编码三种灰色 |

### 当前问题

- `drawAsteroid()` 中三色径向渐变硬编码为 `#9ca3af` / `#6b7280` / `#374151`（灰-中灰-深灰）
- `Asteroid` 接口无颜色属性
- `createAsteroid()` 不产生颜色数据
- 所有陨石外观完全相同

### 真实陨石颜色参考（来源：USRA、ASU、GeologyIn）

| 类型 | 描述 | 典型颜色 |
|------|------|----------|
| 新鲜熔壳（石陨石） | 穿越大气层形成，最常见 | 黑色、深褐色、暗灰色 |
| 风化铁陨石 | 熔壳剥落，铁氧化 | 红棕色、锈橙色 |
| 球粒陨石内部 | 切面可见球粒 | 浅灰至中灰，带褐色调 |
| 碳质陨石 | 富含碳，深色基质 | 炭黑、深灰 |
| 橄榄陨石 | 橄榄石晶体+金属 | 暗绿、棕黄 |
| 玻璃陨石 | 半透明玻璃态 | 深绿、棕褐 |

---

## 提议的变更

### 1. [types.ts](file:///c:/Users/USER/Documents/projects/demo/lib/game/types.ts) — 扩展 `Asteroid` 接口

**修改内容**：添加 `palette: number` 字段。

```ts
export interface Asteroid {
  // ... 现有字段 ...
  /** 颜色调色板索引，用于随机陨石外观 */
  palette: number;
}
```

**原因**：让每颗陨石携带自己的颜色身份，绘制时读取该索引选择对应调色板。

---

### 2. [entities.ts](file:///c:/Users/USER/Documents/projects/demo/lib/game/entities.ts) — 定义调色板常量 + 修改创建/绘制函数

#### 2a. 新增陨石颜色调色板常量（文件顶部附近）

```ts
/** 陨石颜色调色板：基于真实陨石颜色，每套含 [高光色, 中间色, 暗面色] */
const ASTEROID_PALETTES: [string, string, string][] = [
  // 1. 新鲜熔壳 - 石陨石 (最常见 ~35% 概率加权)
  ["#4a4a4a", "#2d2d2d", "#1a1a1a"],
  ["#3d3d3d", "#262626", "#141414"],
  // 2. 风化铁陨石 - 锈色系
  ["#8b6914", "#6b4f1a", "#4a3512"],
  ["#9b5533", "#6e3a20", "#472515"],
  // 3. 球粒陨石 - 浅灰带褐
  ["#a8a090", "#7a7068", "#504840"],
  ["#b0a898", "#888070", "#585048"],
  // 4. 碳质陨石 - 炭黑
  ["#3a3a3a", "#202020", "#0f0f0f"],
  // 5. 橄榄陨石 - 暗绿棕
  ["#4a5540", "#2d3528", "#1a2015"],
  // 6. 玻璃陨石 - 深绿褐
  ["#3d4a35", "#263020", "#141a10"],
];
```

#### 2b. 修改 `createAsteroid()`

在返回对象中添加 `palette` 字段，使用加权随机选择（新鲜熔壳类更常见，与真实陨石分布一致）：

```ts
palette: Math.floor(Math.random() * ASTEROID_PALETTES.length),
```

（数组前 2 个为新鲜熔壳，概率自然更高；如需更精确加权可用加权函数）

#### 2c. 修改 `drawAsteroid()`

将硬编码的三个颜色替换为从 `asteroid.palette` 索引读取：

```ts
const [highlight, mid, dark] = ASTEROID_PALETTES[asteroid.palette];
grad.addColorStop(0, highlight);
grad.addColorStop(0.6, mid);
grad.addColorStop(1, dark);
```

其他绘制逻辑（形状、陨石坑、描边）保持不变。

---

### 涉及文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| [types.ts](file:///c:/Users/USER/Documents/projects/demo/lib/game/types.ts) | 编辑 | 添加 `palette: number` 到 `Asteroid` 接口 |
| [entities.ts](file:///c:/Users/USER/Documents/projects/demo/lib/game/entities.ts) | 编辑 | 添加 `ASTEROID_PALETTES` 常量，修改 `createAsteroid` 和 `drawAsteroid` |

---

## 假设 & 决策

1. **调色板结构**：保持现有三色径向渐变结构（高光/中间/暗面），只替换颜色值，不做渲染方式变更
2. **不增加新依赖**：纯逻辑改动，不引入新库
3. **加权策略**：通过数组顺序自然加权（前 2 个调色板为最常见的熔壳色，占 ~20% 概率），足够简单且效果合理
4. **向后兼容**：仅新增字段，不影响现有 `Asteroid` 对象序列化或其他逻辑
5. **陨石坑和描边不变**：保持 `rgba(0,0,0,0.25)` 坑色和 `rgba(0,0,0,0.4)` 描边，与所有调色板均适配

---

## 验证步骤

1. 启动游戏 `npm run dev`，访问 `/game/space-escape`
2. 观察多颗陨石是否呈现不同的颜色（黑/棕/灰/绿等）
3. 确认陨石坑和描边在所有颜色调色板上仍清晰可见
4. 确认游戏运行流畅，无性能劣化（颜色只是运行时读取数组，无额外开销）
