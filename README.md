# Z-Tools

一个多功能的 Web 工具集，包含天气查询和记账管理等实用工具。

## 📁 项目结构

```
Z-Tools/
├── index.html          # 主页导航
├── weather-app.html    # 天气查询应用
├── accounting.html     # 记账管理应用
├── server.js           # 简易服务器脚本
├── Z-TOOLS-CONFIG.md   # 配置说明文档
└── README.md           # 项目说明
```

## ✨ 功能特性

### 🌤️ 天气应用
- 支持全国 300+ 城市天气查询
- 实时天气数据展示
- 7 天天气预报
- 自动定位获取天气

### 💰 记账管理
- 收入/支出分类管理
- 月度预算设置
- 数据可视化统计
- 本地数据持久化

## 🚀 快速开始

### 本地运行

```bash
# 启动简易服务器
node server.js

# 访问地址
# http://localhost:8000
```

### 环境变量配置

天气应用需要配置和风天气 API Key：

| 变量名 | 说明 |
|--------|------|
| HEFENG_API_KEY | 和风天气 API 密钥 |
| HEFENG_BASE_URL | API 基础地址（可选） |

### Netlify 部署

1. 登录 Netlify 并连接 GitHub 仓库
2. 在 **Site Settings → Environment Variables** 添加环境变量
3. 自动部署完成后即可访问

## 🛠️ 技术栈

- HTML5 / CSS3
- JavaScript (ES6+)
- Tailwind CSS
- 和风天气 API

## 📄 许可证

MIT License

---

*Made with ❤️ by Z-Tools Team*
