# バックエンド用Dockerfile
FROM node:20-alpine AS base

# 依存関係のインストール
FROM base AS deps
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./
COPY prisma ./prisma/

# 本番依存関係のみインストール
RUN npm ci --only=production && npm cache clean --force

# Prisma Clientを生成
RUN npx prisma generate

# ビルド
FROM base AS builder
WORKDIR /app

# 依存関係をコピー
COPY package*.json ./
RUN npm ci

# ソースコードをコピー
COPY . .

# TypeScriptをコンパイル
RUN npm run build

# 本番イメージ
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# ユーザーを作成
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 hono

# 必要なファイルをコピー
COPY --from=deps --chown=hono:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=hono:nodejs /app/dist ./dist
COPY --from=builder --chown=hono:nodejs /app/prisma ./prisma
COPY --from=builder --chown=hono:nodejs /app/package*.json ./

USER hono

EXPOSE 4000

ENV PORT=4000
ENV DATABASE_URL="postgresql://developer:development@postgres:5432/ordering_system"

CMD ["node", "dist/index.js"]
