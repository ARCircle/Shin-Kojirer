# Shin-Kojirer

スマホ完結型の注文・会計・呼び出しシステム

顧客がスマートフォンから商品を注文・支払いし、キッチンがリアルタイムで調理状況を管理し、完成時に顧客に通知する仕組みを提供します。

## 主な機能

- 📱 **スマホ注文**: 顧客が商品を選択してその場で支払い
- 👨‍🍳 **キッチンディスプレイ**: リアルタイムで注文を確認・調理管理
- 🔔 **リアルタイム通知**: WebSocketで調理状況をリアルタイム配信
- 📊 **商品管理**: 管理画面から商品の追加・編集が可能
- 🎫 **呼び出し番号**: 注文ごとに自動採番される呼び出し番号

## 技術スタック

### バックエンド
- **Hono**: 高速軽量Node.jsフレームワーク
- **Prisma**: TypeScript対応ORM
- **PostgreSQL**: データベース
- **Socket.io**: WebSocketによるリアルタイム通信
- **Winston**: ロギング

### フロントエンド
- **Next.js 15**: React 19ベースのフルスタックフレームワーク
- **TailwindCSS 4**: ユーティリティファーストCSS
- **Socket.io Client**: リアルタイム通信クライアント

## セットアップ

### 前提条件

以下がインストールされている必要があります：

- Node.js 20以上
- npm 9以上
- Docker & Docker Compose

### 1. リポジトリのクローン

```bash
git clone https://github.com/arcircle/shin-kojirer.git
cd shin-kojirer
```

### 2. 依存関係のインストール

```bash
npm install
```

このコマンドでルート、バックエンド、フロントエンドすべてのワークスペースの依存関係がインストールされます。

### 3. データベースの起動

```bash
docker-compose up -d
```

PostgreSQLコンテナが起動します（ポート5432）。

### 4. データベースのセットアップ

```bash
# バックエンドディレクトリで実行
cd backend

# Prismaスキーマをデータベースに適用
npm run db:push

# Prisma Clientを生成
npm run db:generate

# シードデータを投入（サンプル商品・注文）
npm run db:seed

# ルートディレクトリに戻る
cd ..
```

### 5. 開発サーバーの起動

```bash
# ルートディレクトリから両方を同時に起動
npm run dev
```

または個別に起動する場合：

```bash
# バックエンドのみ
npm run dev:backend

# フロントエンドのみ
npm run dev:frontend
```

### 6. アクセス

- **フロントエンド（注文画面）**: http://localhost:3000
- **キッチンディスプレイ**: http://localhost:3000/kitchen
- **管理画面**: http://localhost:3000/admin
- **バックエンドAPI**: http://localhost:4000
- **ヘルスチェック**: http://localhost:4000/health

## 主要コマンド

### 開発

```bash
# 両方の開発サーバーを起動
npm run dev

# バックエンドのみ起動
npm run dev:backend

# フロントエンドのみ起動
npm run dev:frontend
```

### データベース

```bash
# バックエンドディレクトリで実行
cd backend

# マイグレーション作成・適用
npm run db:migrate

# スキーマをDBに反映（開発時）
npm run db:push

# Prisma Clientを再生成
npm run db:generate

# Prisma Studioでデータ確認
npm run db:studio

# シードデータを再投入
npm run db:seed
```

### ビルド

```bash
# バックエンドビルド
cd backend
npm run build

# フロントエンドビルド
cd frontend
npm run build
```

### テスト

```bash
# バックエンドテスト（Vitest）
cd backend
npm test

# フロントエンドE2Eテスト（Playwright）
cd frontend
npm run test:e2e
npm run test:e2e:ui  # UIモード
```

### Lint & Format

```bash
# フロントエンドのlint
cd frontend
npm run lint

# Prettierでフォーマット（各ワークスペースで実行）
npx prettier --write .
```

## プロジェクト構成

```
shin-kojirer/
├── backend/              # バックエンド（Hono + Prisma）
│   ├── prisma/          # Prismaスキーマとマイグレーション
│   ├── src/
│   │   ├── api/         # APIエンドポイント
│   │   ├── services/    # ビジネスロジック
│   │   ├── models/      # 型定義
│   │   ├── lib/         # データベース接続
│   │   └── utils/       # ユーティリティ（ロガーなど）
│   └── package.json
├── frontend/            # フロントエンド（Next.js）
│   ├── src/
│   │   ├── app/         # App Router（ページ）
│   │   ├── hooks/       # カスタムフック
│   │   └── lib/         # APIクライアント
│   └── package.json
├── docker-compose.yml   # PostgreSQL定義
├── package.json         # ワークスペース定義
└── README.md
```

## 使い方

### 1. 注文フロー（顧客側）

1. http://localhost:3000 にアクセス
2. 商品（ラーメン、トッピング、割引）を選択
3. カートの内容と合計金額を確認
4. 「注文して支払う」をクリック
5. 呼び出し番号が表示された注文状況ページに遷移
6. リアルタイムで調理状況が更新される
7. 全て完成すると「お料理ができました！」と通知

### 2. キッチン管理

1. http://localhost:3000/kitchen にアクセス
2. 新しい注文がリアルタイムで表示される
3. 各グループの「調理開始」→「完成」ボタンで状況を更新
4. 全グループが完成すると顧客に通知が送信される

### 3. 商品管理

1. http://localhost:3000/admin にアクセス
2. 既存商品の一覧を確認
3. 新商品を追加（名前、価格、種類を入力）
4. 商品の在庫状態を切り替え

## データベース情報

PostgreSQLコンテナの接続情報：

- **データベース名**: `ordering_system`
- **ユーザー名**: `developer`
- **パスワード**: `development`
- **ポート**: `5432`
- **接続URL**: `postgresql://developer:development@localhost:5432/ordering_system`

## トラブルシューティング

### データベース接続エラー

```bash
# コンテナの状態を確認
docker-compose ps

# コンテナが起動していない場合
docker-compose up -d

# ログを確認
docker-compose logs postgres
```

### ポート競合エラー

バックエンド（4000）やフロントエンド（3000）のポートが既に使用されている場合：

```bash
# 使用中のポートを確認（macOS/Linux）
lsof -i :4000
lsof -i :3000

# プロセスを終了
kill -9 <PID>
```

### Prismaエラー

```bash
# Prisma Clientを再生成
cd backend
npm run db:generate

# データベースをリセット（注意：全データ削除）
npx prisma migrate reset
```

### 依存関係のエラー

```bash
# node_modulesを削除して再インストール
rm -rf node_modules backend/node_modules frontend/node_modules
npm install
```

## E2Eテスト

プロジェクトルートに`e2e-test-flow.js`というPlaywrightベースのE2Eテストがあります：

```bash
# 開発サーバー起動後、別ターミナルで
node e2e-test-flow.js
```

このスクリプトは以下をテストします：
- 商品選択とカート機能
- 注文作成と支払い
- キッチンディスプレイでの調理管理
- WebSocketによるリアルタイム通知
- 管理画面での商品追加

## ライセンス

ISC

## リポジトリ

https://github.com/arcircle/shin-kojirer
