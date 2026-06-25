# Zeabur + Next.js 14 Dockerfile
# 多阶段构建，不依赖 standalone 输出模式

FROM node:20-alpine AS base
WORKDIR /app

# 依赖安装层
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# 构建层
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 运行层
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js

USER nextjs
EXPOSE 8080
CMD ["npx", "next", "start"]
