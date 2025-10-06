# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Shin-Kojirerは、スマホ完結型の注文・会計・呼び出しシステムです。顧客がスマートフォンから商品を注文・支払いし、キッチンがリアルタイムで調理状況を管理し、完成時に顧客に通知する仕組みを提供します。

## アーキテクチャ

### モノレポ構成

npm workspacesを使用したモノレポ構成:

- **backend**: Hono (Node.js) + Prisma + PostgreSQL + Socket.io
- **frontend**: Next.js 15 (React 19) + TailwindCSS 4 + Socket.io Client

### データモデル

Prismaスキーマ (`backend/prisma/schema.prisma`) の主要なモデル:

- **Merchandise**: 商品情報（ベースアイテム、トッピング、割引）
- **Order**: 注文全体（呼び出し番号、ステータス）
- **OrderItemGroup**: 注文内のグループ（調理状況管理）
- **OrderItem**: 個別商品項目

### リアルタイム通信

WebSocketを使用した双方向通信:

- **backend**: `src/services/websocketService.ts` でSocket.ioサーバーを実装
- **frontend**: `src/hooks/useSocket.ts` でSocket.ioクライアントフック提供
- 注文作成、ステータス更新、調理状況変更などをリアルタイムで通知

### 主要ページ

- `/` - 注文画面（商品選択、カート、支払い）
- `/orders/[id]` - 注文状況ページ（リアルタイム更新）
- `/kitchen` - キッチンディスプレイ（調理管理）
- `/admin` - 管理画面（商品管理）

## 初回セットアップ（完全な手順）

新しい環境で最初からセットアップする場合の完全な手順:

```bash
# 1. リポジトリをクローン
git clone https://github.com/arcircle/shin-kojirer.git
cd shin-kojirer

# 2. 依存関係をインストール
npm install

# 3. PostgreSQLコンテナを起動
docker-compose up -d

# 4. データベースをセットアップ
cd backend
npm run db:push      # Prismaスキーマをデータベースに適用
npm run db:generate  # Prisma Clientを生成
npm run db:seed      # シードデータを投入
cd ..

# 5. 開発サーバーを起動
npm run dev
```

アクセス先:
- フロントエンド（注文画面）: http://localhost:3000
- キッチンディスプレイ: http://localhost:3000/kitchen
- 管理画面: http://localhost:3000/admin
- バックエンドAPI: http://localhost:4000
- ヘルスチェック: http://localhost:4000/health

## 開発コマンド

### データベース

データベースはDockerで管理。起動前に必ずPostgreSQLコンテナを起動してください:

```bash
docker-compose up -d
```

データベース接続情報:

- DB名: `ordering_system`
- ユーザー: `developer`
- パスワード: `development`
- ポート: `5432`
- 接続URL: `postgresql://developer:development@localhost:5432/ordering_system`

### Prismaコマンド

```bash
# バックエンドディレクトリで実行
cd backend

# スキーマ変更をマイグレーション
npm run db:migrate

# Prisma Clientを生成
npm run db:generate

# スキーマをDBにプッシュ（開発時）
npm run db:push

# Prisma Studioでデータ確認
npm run db:studio

# シードデータを投入
npm run db:seed
```

### 開発サーバー

```bash
# ルートディレクトリから両方を起動
npm run dev

# または個別に起動
npm run dev:backend  # バックエンドのみ (ポート4000)
npm run dev:frontend # フロントエンドのみ (ポート3000)
```

- バックエンド: http://localhost:4000
- フロントエンド: http://localhost:3000
- ヘルスチェック: http://localhost:4000/health

### テスト

```bash
# バックエンドテスト（Vitest）
cd backend
npm test

# 契約テスト
npm run test:contract

# フロントエンドE2Eテスト（Playwright）
cd frontend
npm run test:e2e
npm run test:e2e:ui  # UIモードで実行
```

### ビルド

```bash
# バックエンド
cd backend
npm run build      # TypeScriptコンパイル
npm start          # プロダクションモードで起動

# フロントエンド
cd frontend
npm run build      # Next.jsビルド
npm start          # プロダクションサーバー起動
```

### Lint & Format

```bash
# ルートディレクトリから
npm run lint       # ESLint実行（フロントエンドのみ設定）

# Prettierは各ワークスペースで実行
```

## 技術スタック詳細

### バックエンド

- **フレームワーク**: Hono（高速軽量Node.jsフレームワーク）
- **ランタイム**: Node.js（@hono/node-server経由）
- **データベース**: PostgreSQL + Prisma ORM
- **WebSocket**: Socket.io
- **ロギング**: Winston
- **開発**: tsx（TypeScript実行）、Vitest（テスト）

### フロントエンド

- **フレームワーク**: Next.js 15（App Router）
- **UIライブラリ**: React 19
- **スタイリング**: TailwindCSS 4
- **WebSocket**: Socket.io Client
- **E2Eテスト**: Playwright

## 重要な実装ポイント

### WebSocket接続の仕組み

バックエンドでHTTPサーバーとHonoアプリを統合し、同じサーバーでWebSocketとHTTPを処理:

- `backend/src/index.ts`: HTTPサーバー作成後、WebSocketサービス初期化、Honoをリクエストハンドラーとしてアタッチ
- クライアントは`useSocket`フックで接続し、ページごとに`subscribe-order`や`subscribe-kitchen`でルームに参加

### 注文フロー

1. 顧客が商品選択し「注文して支払う」をクリック
2. バックエンドで注文作成（OrderとOrderItemGroup）
3. WebSocketで`order-created`イベントをキッチンに配信
4. 注文状況ページで`subscribe-order`し、リアルタイム更新を受信
5. キッチンで調理ステータス更新（NOT_READY → PREPARING → READY）
6. 全グループがREADYになると`order-ready`イベントで顧客に通知

### データベース初期化とトラブルシューティング

新環境でのセットアップ手順:

```bash
# 1. PostgreSQLコンテナ起動
docker-compose up -d

# 2. バックエンドディレクトリへ移動
cd backend

# 3. スキーマをデータベースに適用（推奨）
npm run db:push

# または、マイグレーション実行（プロダクション環境）
npm run db:migrate

# 4. Prisma Clientを生成
npm run db:generate

# 5. シードデータ投入（サンプル商品・注文作成）
npm run db:seed
```

**よくある問題と解決方法:**

1. **マイグレーションエラー（P3005: database schema is not empty）**
   - 既にデータがある場合に発生
   - 解決策: `npm run db:push` を使用（開発環境）

2. **データベース接続エラー**
   ```bash
   # コンテナの状態確認
   docker-compose ps

   # コンテナが起動していない場合
   docker-compose up -d

   # ログ確認
   docker-compose logs postgres
   ```

3. **Prisma Clientが見つからない**
   ```bash
   npm run db:generate
   ```

4. **ポート競合（4000または3000が使用中）**
   ```bash
   # macOS/Linuxでポート使用確認
   lsof -i :4000
   lsof -i :3000

   # プロセス終了
   kill -9 <PID>
   ```

5. **依存関係のエラー**
   ```bash
   # ルートディレクトリで全削除・再インストール
   rm -rf node_modules backend/node_modules frontend/node_modules
   npm install
   ```

## E2Eテストフロー

`e2e-test-flow.js`はPlaywrightを使った主要フローの検証スクリプト:

- 商品選択・カート・合計計算
- 注文作成・支払い処理
- キッチンディスプレイでの調理管理
- WebSocketによるリアルタイム通知
- 管理ページでの商品追加

スタンドアロンスクリプトなので、開発サーバー起動後に`node e2e-test-flow.js`で実行可能。
