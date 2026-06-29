# 皮肤选择页飞船图片统一背景

## 摘要

皮肤选择页中，飞船图片的容器没有设置背景色。透明 PNG 在不同渲染环境下显示不一致（如泰坦皮肤出现棋盘格背景）。需要为所有飞船图片容器添加统一的深色游戏背景。

---

## 问题分析

当前 skin-select 页面中 4 处显示飞船图片，容器均无背景色：

| 位置 | 容器样式 | 行号 |
|------|---------|------|
| 当前皮肤横幅 | `w-16 h-16 rounded-xl overflow-hidden` | ~167 |
| 皮肤预览区 | `w-32 h-32 rounded-xl overflow-hidden` | ~201 |
| 已解锁网格 | `aspect-square rounded-lg overflow-hidden` | ~236 |
| 未解锁网格 | `aspect-square rounded-lg overflow-hidden` | ~285 |

透明 PNG 在无背景容器中，浏览器可能渲染为默认透明格或页面背景色，导致不一致。

---

## 变更

### 唯一文件：[skin-select/page.tsx](file:///c:/Users/USER/Documents/projects/demo/app/game/space-escape/skin-select/page.tsx)

在 4 处图片容器的 className 中添加 `bg-[#0f172a]`（slate-900 深色，与游戏太空背景一致）：

1. **当前皮肤横幅**（~167 行）：`w-16 h-16 rounded-xl overflow-hidden border-2 border-purple-500/50`
   → 加 `bg-[#0f172a]`

2. **皮肤预览区**（~201 行）：`w-32 h-32 rounded-xl overflow-hidden border-2 border-purple-500/50 mb-4`
   → 加 `bg-[#0f172a]`

3. **已解锁网格卡片**（~236 行）：`relative aspect-square rounded-lg sm:rounded-xl overflow-hidden border-2 ...`
   → 加 `bg-[#0f172a]`

4. **未解锁网格卡片**（~285 行）：`relative aspect-square rounded-lg sm:rounded-xl overflow-hidden border-2 border-slate-700 opacity-70 ...`
   → 加 `bg-[#0f172a]`

---

## 不需要修改的文件

- 皮肤图片本身（PNG 保持透明，便于游戏中 Canvas 渲染）
- 游戏引擎 / entities（游戏中不需要卡片背景）

---

## 验证

1. `npm run dev` → 访问 `/game/space-escape/skin-select`
2. 确认所有飞船卡片（已解锁/未解锁/预览/当前）背景色统一为深色
3. 确认泰坦皮肤不再出现棋盘格背景
4. 确认选中状态（紫色边框）仍然正常显示
