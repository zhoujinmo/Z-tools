# Z-Tools 配置文件

## 环境变量配置

本项目需要以下环境变量，请在 Zeabur 控制台或本地 `.env.local` 中进行配置：

### Supabase 配置

1. **NEXT_PUBLIC_SUPABASE_URL**
   - 来源：[Supabase Dashboard](https://supabase.com/dashboard)
   - 说明：Supabase 项目 URL
   - 必填：是

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - 来源：[Supabase Dashboard](https://supabase.com/dashboard)
   - 说明：Supabase 匿名公钥
   - 必填：是

### 天气应用 API 配置

1. **HEFENG_API_KEY**
   - 来源：[和风天气开发者平台](https://dev.qweather.com/)
   - 说明：和风天气 API 密钥
   - 必填：是

2. **HEFENG_BASE_URL** (可选)
   - 默认值：`https://m667cfw6ja.re.qweatherapi.com`
   - 说明：和风天气 API 地址
   - 必填：否

## Zeabur 部署配置步骤

1. 登录 [Zeabur 控制台](https://zeabur.com/)
2. 进入项目 → 服务 → 设置
3. 找到「环境变量」部分
4. 添加上述环境变量
5. 点击「重新部署」使配置生效

## 数据库初始化

1. 在 Supabase Dashboard 中创建项目
2. 进入 SQL Editor
3. 依次执行 `supabase/migrations/` 目录下的所有迁移文件
4. 配置完成后即可使用
