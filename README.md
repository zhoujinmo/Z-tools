# Z-Tools

一个多功能的 Web 工具集，包含天气查询、记账管理和太空游戏等实用工具。

## 📁 项目结构

```
Z-Tools/
├── app/                    # Next.js App Router
│   ├── page.tsx            # 主页导航
│   ├── weather/            # 天气查询应用
│   ├── accounting/         # 记账管理应用
│   ├── game/space-escape/  # 太空逃亡游戏
│   └── api/                # API 路由
├── components/             # React 组件
├── lib/                    # 工具库
├── public/                 # 静态资源
├── supabase/migrations/    # 数据库迁移
└── README.md               # 项目说明
```

## ✨ 功能特性

### 🌤️ 天气应用
- 支持全国 300+ 城市天气查询
- 实时天气数据展示
- 7 天天气预报
- 自动定位获取天气

### 💰 记账管理
- 收入/支出分类管理
- 多账本支持
- 月度预算设置
- 数据可视化统计
- 数据导出备份（Excel）
- 暗黑模式

### 🚀 太空逃亡游戏
- Canvas 2D 射击躲避游戏
- 13 种飞船皮肤，成就解锁
- 全球排行榜
- 支持键盘和触屏操作
- 背景音乐

## 🚀 快速开始

### 本地运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问地址
# http://localhost:3000
```

### 环境变量配置

复制 `.env.local.example` 为 `.env.local` 并配置以下变量：

| 变量名 | 说明 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 |
| `HEFENG_API_KEY` | 和风天气 API 密钥 |
| `HEFENG_BASE_URL` | 和风天气 API 基础地址（可选） |

### Zeabur 部署

1. 登录 [Zeabur](https://zeabur.com/) 并创建项目
2. 点击「添加服务」，选择「Git 仓库」
3. 授权并选择你的 GitHub 仓库
4. Zeabur 会自动识别为 Next.js 项目
5. 在服务设置中配置环境变量（见上表）
6. 点击部署，等待构建完成

**构建命令：** `npm run build`  
**启动命令：** `npm start`

> Zeabur 会自动检测 Next.js 项目并配置正确的构建和启动命令，无需手动设置。

## 🛠️ 技术栈

- Next.js 14 (App Router)
- React 18 + TypeScript
- Tailwind CSS
- Supabase (Auth + Database)
- Chart.js (数据可视化)
- Canvas API (游戏)

## 📄 许可证

MIT License

---

*Made with ❤️ by Z-Tools Team*
