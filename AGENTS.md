# AGENTS.md

## Project Overview

Z-Tools (v2.0.0) — 多功能 Web 工具集。基于 Next.js 14 App Router 的全栈应用，包含天气查询、记账工具和太空逃亡小游戏。

## Repo Layout

```
├── app/                    # Next.js App Router 页面和 API 路由
│   ├── api/                # REST API 路由（auth, game, ledgers, transactions, sync, backup, weather）
│   ├── game/space-escape/  # 太空逃亡游戏（Canvas 游戏 + 音乐/皮肤选择）
│   ├── accounting/         # 记账工具页面
│   └── weather/            # 天气查询页面
├── components/             # 共享 React 组件（accounting 等）
├── lib/                    # 工具库和业务逻辑
│   ├── game/               # 游戏引擎（engine, entities, types, audio）
│   ├── supabase/           # Supabase 客户端封装（client, server, admin, middleware）
│   ├── auth.ts             # 认证逻辑
│   ├── db.ts               # 本地 SQLite 数据库
│   └── types.ts            # 共享 TypeScript 类型
├── public/                 # 静态资源（音频、皮肤图片、头像）
├── supabase/migrations/    # Supabase 数据库迁移 SQL
├── scripts/                # 辅助脚本（图片提取等）
└── database/               # 本地 SQLite 数据库文件
```

## How to Run

### Prerequisites

- Node.js >= 18.16.0（推荐 v20，见 `.nvmrc`）
- npm
- Supabase 项目（用于认证和数据存储）
- 和风天气 API Key（用于天气功能）

### Setup

```bash
# 安装依赖
npm install

# 复制并配置环境变量
cp .env.local.example .env.local
# 编辑 .env.local 填入 Supabase URL、Anon Key 和和风天气 API Key
```

### Development

```bash
npm run dev        # 启动开发服务器（默认 http://localhost:3000）
```

### Production

```bash
npm run build      # 构建生产版本
npm run start      # 启动生产服务器
```

## Build, Test, and Lint Commands

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | ESLint 代码检查 |

> 注意：当前项目没有配置单元测试或集成测试。添加测试框架（如 Jest、Vitest）后请在此处补充测试命令。

## Engineering Conventions

### TypeScript

- 严格模式开启（`strict: true`）
- 路径别名：`@/*` 映射到项目根目录（`./`）
- 所有新代码使用 TypeScript，不要引入 `.js` 文件
- API 响应使用统一的 `ApiResponse` 类型（定义在 `lib/types.ts`）

### React / Next.js

- 使用 App Router（`app/` 目录），不要使用 Pages Router
- 服务端组件为默认，需要交互的组件加 `"use client"` 指令
- API 路由使用 `NextRequest` / `NextResponse`
- 图片优化已禁用（`images.unoptimized: true`），适用于静态导出场景

### Styling

- Tailwind CSS + CSS 变量
- 暗色模式通过 `class` 策略启用（`darkMode: "class"`）
- 自定义颜色在 `tailwind.config.ts` 中定义（primary, income, expense 等语义化颜色）
- 全局样式在 `app/globals.css`

### 数据层

- **Supabase**：认证和云数据（profiles、game_scores 等）
  - `lib/supabase/client.ts` — 浏览器端客户端
  - `lib/supabase/server.ts` — 服务端客户端
  - `lib/supabase/admin.ts` — 管理员客户端（Service Role Key）
  - `lib/supabase/middleware.ts` — 中间件（当前已禁用）
- **SQLite**（`database/bill.sqlite`）：本地记账数据
- 数据库迁移 SQL 放在 `supabase/migrations/`，按时间戳命名

### 游戏开发

- 游戏核心逻辑在 `lib/game/`（engine、entities、types、audio）
- UI 页面在 `app/game/space-escape/`
- 使用 Canvas API 渲染，不要引入 WebGL 或游戏框架
- 皮肤资源放在 `public/skins/`

## PR Expectations

- **开发前必须同步最新 main**：开始新功能或修复前，先将本地 main 更新到远程最新，再同步到 feature 分支，避免代码冲突。标准流程：
  ```bash
  git checkout main
  git pull origin main
  git checkout feature/你的分支名
  git merge origin main    # 或 git rebase origin main
  ```
- **推送前拉取最新代码**：推送 feature 分支前，先 `git pull --rebase origin feature/你的分支名`，确保合并最新远程变更后再推送
- 所有改动必须通过 `npm run lint` 无报错
- 确保 `npm run build` 能成功完成
- 新功能需要有完整的 API 路由（放在 `app/api/` 下）
- 新页面放在 `app/` 对应目录下
- 共享组件放 `components/`，工具函数放 `lib/`
- 皮肤/音频等静态资源放 `public/`

## Constraints and Do-Not Rules

- **不要** 在 Edge Runtime 中使用需要 Node.js API 的 Supabase 方法（已知不兼容，见 `middleware.ts` 注释）
- **不要** 将 `.env.local` 或任何含密钥的文件提交到版本库
- **不要** 修改 `.gitignore` 中已排除的文件类型（如 `node_modules/`、`.next/`）
- **不要** 引入新的 CSS-in-JS 库（如 styled-components），统一使用 Tailwind
- **不要** 在 API 路由中直接暴露 Supabase Service Role Key 给客户端
- **不要** 在组件中硬编码 API URL，使用环境变量
- **不要** 移除 `reactStrictMode: true` 配置
- **不要** 在 `supabase/` 目录下放置 TypeScript 源码（该目录被 tsconfig 排除）

## What "Done" Means and How to Verify

一个任务完成后应满足：

1. **代码质量**：`npm run lint` 无错误
2. **构建通过**：`npm run build` 成功
3. **功能可用**：在 `npm run dev` 下手动验证功能正常
4. **类型安全**：无 TypeScript 类型错误
5. **无副作用**：不影响其他功能模块的正常运行

验证步骤：

```bash
# 1. 类型检查和构建
npm run build

# 2. Lint 检查
npm run lint

# 3. 启动开发服务器验证
npm run dev
```
