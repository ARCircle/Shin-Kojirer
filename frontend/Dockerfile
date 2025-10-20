# フロントエンド用Dockerfile
FROM node:20-alpine AS base

# 依存関係のインストール
FROM base AS deps
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 本番依存関係のみインストール
RUN npm ci --only=production && npm cache clean --force

# ビルド用の依存関係をインストール
FROM base AS builder
WORKDIR /app

# 依存関係をコピー
COPY package*.json ./
RUN npm ci

# ソースコードをコピー
COPY . .

# Next.jsのテレメトリを無効化
ENV NEXT_TELEMETRY_DISABLED=1

# バックエンドAPIのURLを環境変数として設定（ビルド時）
ENV NEXT_PUBLIC_API_URL=http://localhost:4000

# Next.jsをビルド
RUN npm run build

# 本番イメージ
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# ユーザーを作成
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next.jsの静的ファイルをコピー
COPY --from=builder /app/public ./public

# Next.jsのビルド出力をコピー
RUN mkdir .next
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Next.jsのスタンドアロンサーバーを起動
CMD ["node", "server.js"]
