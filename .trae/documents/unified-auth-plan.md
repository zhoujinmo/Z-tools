# 统一用户数据库与排行榜绑定计划

## 一、概述

将太空逃亡游戏的 `localStorage` 用户系统迁移到 Supabase Auth，与记账应用共享同一用户数据库，并修复排行榜的分数提交与查询功能，实现游戏排行榜与用户数据库绑定。

---

## 二、现状分析

### 2.1 两套独立认证系统

| 维度 | 记账应用 | 太空逃亡游戏 |
|------|---------|-------------|
| 存储 | Supabase `auth.users` + `public.profiles` | `localStorage`（`space-escape-users`） |
| 密码 | Supabase 加密存储 | **明文存储**（安全风险） |
| 会话 | Supabase Cookie（服务端） | `localStorage`（`space-escape-current-user`） |
| API | `POST /api/auth/login`, `/api/auth/register` | 纯客户端匹配 |

### 2.2 排行榜现状

- **`game_scores` 表**已存在于 Supabase，RLS 已配置
- **提交分数**：`GameCanvas.tsx` 仅设置提示文字 `"分数已记录！"`，**未实际调用任何 API**
- **获取排行榜**：`Leaderboard.tsx` 调用 `GET /api/game/scores`，但 **API 路由不存在**
- 结论：排行榜功能**完全不可用**

### 2.3 皮肤系统

- 纯 `localStorage`，无服务端持久化
- 本次不迁移（保持客户端存储，后续可优化）

---

## 三、修改方案

### 步骤 1：改造 GameAuthModal — 接入 Supabase Auth

**文件**：`app/game/space-escape/GameAuthModal.tsx`

**改动**：
- 移除所有 localStorage 用户注册/登录逻辑
- 注册改为调用 `POST /api/auth/register`（复用记账应用的注册 API）
- 登录改为调用 `POST /api/auth/login`（复用记账应用的登录 API）
- 移除验证码组件、密码强度检测（API 端已处理）
- 保留 "游客模式"（仍用 localStorage guest 用户）
- 成功后返回 `AuthUser` 对象（与记账应用一致）

### 步骤 2：改造 GameCanvas — 使用 Supabase 用户状态

**文件**：`app/game/space-escape/GameCanvas.tsx`

**改动**：
- 用户状态从 `localStorage` 改为从 Supabase session 获取
- `getStoredUser()` 改为检查 `supabase.auth.getSession()`
- 退出登录改为调用 `POST /api/auth/logout`
- 游戏结束时调用 `POST /api/game/scores` 提交分数
- 移除 `AuthUser` 类型的内联定义，统一使用 `lib/types.ts` 中的定义

### 步骤 3：新增排行榜 API 路由

**新建文件**：`app/api/game/scores/route.ts`

**功能**：
- `GET /api/game/scores` — 查询 top 20 排行榜
  - 关联 `public.profiles` 获取用户名
  - 返回：`{ id, username, score, created_at }`
- `POST /api/game/scores` — 提交分数
  - 从 Supabase session 获取 `user.id`
  - 写入 `public.game_scores` 表
  - 返回：`{ success: true, id }`

### 步骤 4：改造 Leaderboard 组件

**文件**：`app/game/space-escape/Leaderboard.tsx`

**改动**：
- 移除对不存在 API 的调用
- 改为通过 Supabase 客户端直接查询 `game_scores` 表
- 或改用新的 `GET /api/game/scores` API
- 显示当前用户高亮标记

---

## 四、文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| **修改** | `app/game/space-escape/GameAuthModal.tsx` | 替换 localStorage 认证为 Supabase Auth API 调用 |
| **修改** | `app/game/space-escape/GameCanvas.tsx` | 用户状态从 Supabase session 获取；游戏结束提交分数 |
| **修改** | `app/game/space-escape/Leaderboard.tsx` | 修复排行榜数据获取，对接 Supabase |
| **新建** | `app/api/game/scores/route.ts` | 排行榜 GET + POST API |
| **修改** | `app/api/auth/register/route.ts` | 确保游戏注册的用户也能正确创建 profile |

---

## 五、数据流对比

### 修改前

```
游戏注册 → localStorage（明文密码）
游戏登录 → localStorage 匹配
分数提交 → 无（仅提示）
排行榜   → 调用不存在的 API → 空
```

### 修改后

```
游戏注册 → POST /api/auth/register → Supabase auth.users + public.profiles
游戏登录 → POST /api/auth/login → Supabase session cookie
分数提交 → POST /api/game/scores → Supabase public.game_scores
排行榜   → GET /api/game/scores → Supabase public.game_scores
```

---

## 六、假设与决策

1. **用户共享**：已在记账应用中注册的用户，可直接在游戏中使用相同账号登录
2. **游客模式保留**：游客不影响统一数据库（游客不创建 Supabase 账户）
3. **皮肤进度暂不迁移**：保持 localStorage 存储，后续可考虑迁移到 Supabase
4. **排行榜显示 Top 20**：与原有设计一致
5. **RLS 策略不变**：`game_scores` 表的 RLS 已配置为 `auth.uid() = user_id`

---

## 七、验证步骤

1. 在游戏注册新用户 → 检查 Supabase `auth.users` 和 `public.profiles` 是否有记录
2. 用同一账号登录记账应用 → 验证可正常登录
3. 玩游戏结束 → 检查 `public.game_scores` 是否有分数记录
4. 查看排行榜 → 验证显示 Top 20 分数列表
5. 游客模式 → 验证仍可正常游戏，但不提交分数到排行榜
