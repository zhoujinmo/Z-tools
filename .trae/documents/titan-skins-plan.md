# 五架泰坦飞机皮肤实现计划

## 摘要

将当前单个「青铜泰坦」传说皮肤替换为 5 架风格各异的泰坦飞机，每架拥有独立的外观图片、配色主题和渐进式碎片解锁门槛。

---

## 用户提供的 5 张图片

按消息中的出现顺序编号：

| 序号 | 视觉特征 | 建议命名 | 建议图片文件名 |
|------|---------|---------|-------------|
| 1 | 橙金色核心，双引擎 | 泰坦·炽焰 | titan-flare.png |
| 2 | 红色核心，宽翼 | 泰坦·血月 | titan-blood.png |
| 3 | 蓝色核心，尖锐机翼 | 泰坦·冰锋 | titan-frost.png |
| 4 | 紫色核心，蝙蝠翼 | 泰坦·暗影 | titan-shadow.png |
| 5 | 绿色核心，六边形 | 泰坦·翡翠 | titan-jade.png |

### 图片保存指引

> **由于我无法从聊天消息中提取图片二进制数据，请手动保存：**
>
> 1. 在 IDE 中右键点击每张图片 →「另存为图片」
> 2. 保存到项目目录：`public/skins/planes/`
> 3. 文件名：
>    - `titan-flare.png`
>    - `titan-blood.png`
>    - `titan-frost.png`
>    - `titan-shadow.png`
>    - `titan-jade.png`
>
> **确保图片是正方形（建议 200×200 到 400×400px），带透明背景的 PNG 格式。**

---

## 当前状态

- 单个传说皮肤 `ship-12`（青铜泰坦），需 10 泰坦碎片
- 碎片 ID：`"titan-shard"`
- 图片路径：`/skins/planes/ship-12.png`

## 变更内容

### 1. [skins.ts](file:///c:/Users/USER/Documents/projects/demo/app/game/space-escape/skins.ts) — 替换传说皮肤定义

删除原有 `ship-12` 传说皮肤，替换为 5 个泰坦系列传说皮肤：

```ts
// ──── 传说 Legendary — 泰坦系列 ────
{
  id: "titan-flare",
  name: "泰坦·炽焰",
  bodyColor: "#b45309",
  highlightColor: "#f59e0b",
  flameColor: "#f97316",
  imageUrl: "/skins/planes/titan-flare.png",
  description: "泰坦工业·橙金核心，双引擎驱动 — 泰坦系列",
  rarity: "legendary",
  unlockMethods: [
    { type: "fragment", description: "收集 10 个泰坦碎片合成", fragmentId: "titan-shard", fragmentRequired: 10 },
  ],
  unlockCondition: "收集10个泰坦碎片解锁",
  unlockCheck: (p) => (p.skinFragments["titan-shard"] ?? 0) >= 10,
},
{
  id: "titan-blood",
  name: "泰坦·血月",
  bodyColor: "#991b1b",
  highlightColor: "#f87171",
  flameColor: "#ef4444",
  imageUrl: "/skins/planes/titan-blood.png",
  description: "泰坦工业·猩红核心，宽翼突击型 — 泰坦系列",
  rarity: "legendary",
  unlockMethods: [
    { type: "fragment", description: "收集 15 个泰坦碎片合成", fragmentId: "titan-shard", fragmentRequired: 15 },
  ],
  unlockCondition: "收集15个泰坦碎片解锁",
  unlockCheck: (p) => (p.skinFragments["titan-shard"] ?? 0) >= 15,
},
{
  id: "titan-frost",
  name: "泰坦·冰锋",
  bodyColor: "#1e40af",
  highlightColor: "#60a5fa",
  flameColor: "#3b82f6",
  imageUrl: "/skins/planes/titan-frost.png",
  description: "泰坦工业·冰蓝核心，高速截击型 — 泰坦系列",
  rarity: "legendary",
  unlockMethods: [
    { type: "fragment", description: "收集 20 个泰坦碎片合成", fragmentId: "titan-shard", fragmentRequired: 20 },
  ],
  unlockCondition: "收集20个泰坦碎片解锁",
  unlockCheck: (p) => (p.skinFragments["titan-shard"] ?? 0) >= 20,
},
{
  id: "titan-shadow",
  name: "泰坦·暗影",
  bodyColor: "#581c87",
  highlightColor: "#c084fc",
  flameColor: "#a855f7",
  imageUrl: "/skins/planes/titan-shadow.png",
  description: "泰坦工业·紫色核心，隐匿型战机 — 泰坦系列",
  rarity: "legendary",
  unlockMethods: [
    { type: "fragment", description: "收集 25 个泰坦碎片合成", fragmentId: "titan-shard", fragmentRequired: 25 },
  ],
  unlockCondition: "收集25个泰坦碎片解锁",
  unlockCheck: (p) => (p.skinFragments["titan-shard"] ?? 0) >= 25,
},
{
  id: "titan-jade",
  name: "泰坦·翡翠",
  bodyColor: "#166534",
  highlightColor: "#4ade80",
  flameColor: "#22c55e",
  imageUrl: "/skins/planes/titan-jade.png",
  description: "泰坦工业·翠绿核心，能量护盾型 — 泰坦系列",
  rarity: "legendary",
  unlockMethods: [
    { type: "fragment", description: "收集 30 个泰坦碎片合成", fragmentId: "titan-shard", fragmentRequired: 30 },
  ],
  unlockCondition: "收集30个泰坦碎片解锁",
  unlockCheck: (p) => (p.skinFragments["titan-shard"] ?? 0) >= 30,
},
```

### 2. [skin-select/page.tsx](file:///c:/Users/USER/Documents/projects/demo/app/game/space-escape/skin-select/page.tsx) — 传说皮肤碎片进度显示

在未解锁皮肤区域，传说皮肤的碎片进度需要改为每个皮肤独立显示需求量，而非固定 `10`。

当前代码（约第 280 行）：
```tsx
{isLegendary && (
  <span className="text-[10px] text-yellow-400 font-bold">
    {fragCount}/10 碎片
  </span>
)}
```

改为读取皮肤的 `unlockMethods` 中的 `fragmentRequired`：
```tsx
{isLegendary && (
  <span className="text-[10px] text-yellow-400 font-bold">
    {fragCount}/{skin.unlockMethods[0]?.fragmentRequired ?? 10} 碎片
  </span>
)}
```

### 3. [skins.ts](file:///c:/Users/USER/Documents/projects/demo/app/game/space-escape/skins.ts) — 兑换面板碎片单价

当前皮肤选择页的碎片兑换功能，碎片单价固定为 100 星际币/个。这不需要改变（碎片通用），但面板提示文案可能需要确认是否仍显示"泰坦碎片"。当前文案已经正确。

---

## 涉及文件

| 文件 | 操作 |
|------|------|
| `public/skins/planes/titan-flare.png` | **用户手动保存** 图片 1 |
| `public/skins/planes/titan-blood.png` | **用户手动保存** 图片 2 |
| `public/skins/planes/titan-frost.png` | **用户手动保存** 图片 3 |
| `public/skins/planes/titan-shadow.png` | **用户手动保存** 图片 4 |
| `public/skins/planes/titan-jade.png` | **用户手动保存** 图片 5 |
| [skins.ts](file:///c:/Users/USER/Documents/projects/demo/app/game/space-escape/skins.ts) | 替换 ship-12 为 5 个泰坦皮肤 |
| [skin-select/page.tsx](file:///c:/Users/USER/Documents/projects/demo/app/game/space-escape/skin-select/page.tsx) | 修复碎片进度显示为动态值 |

---

## 不需要修改的文件

- `types.ts` — SkinStyle 类型已支持
- `engine.ts` — 皮肤图片加载机制通用，无需改动
- `entities.ts` — drawPlayer 已支持任意 imageUrl
- `GameCanvas.tsx` — 无需改动

---

## 决策

1. **碎片需求渐进递增**：10/15/20/25/30，鼓励长期收集
2. **所有泰坦皮肤共享同一种碎片（titan-shard）**，无需新增碎片类型
3. **保留 ship-12.png 文件**但不再被引用（避免已解锁用户数据异常）

---

## 验证

1. 保存 5 张图片到 `public/skins/planes/`
2. `npm run dev` → 皮肤选择页确认 5 个泰坦皮肤显示正确
3. 确认每个泰坦皮肤碎片需求量显示正确（10/15/20/25/30）
4. 确认游戏中选择泰坦皮肤后图片正确渲染
5. 确认碰撞检测正常（像素级掩码自动生成）
