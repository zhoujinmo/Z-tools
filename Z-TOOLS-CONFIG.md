# Z-Tools 配置文件

## 环境变量配置

本项目需要以下环境变量，请在 Netlify 后台进行配置：

### 天气应用 API 配置

1. **HEFENG_API_KEY**
   - 来源：[和风天气开发者平台](https://dev.qweather.com/)
   - 说明：和风天气 API 密钥

2. **HEFENG_BASE_URL** (可选)
   - 默认值：`https://m667cfw6ja.re.qweatherapi.com`
   - 说明：和风天气 API 地址

## 配置步骤

1. 登录 [Netlify](https://app.netlify.com/)
2. 进入 Site settings → Environment variables
3. 添加上述环境变量
4. 重新部署站点
