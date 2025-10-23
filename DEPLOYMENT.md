# デプロイメントガイド（Kubernetes）

このドキュメントでは、Shin-KojirerをKubernetesクラスターにデプロイする際の環境変数とURL設定について説明します。

## 概要

- **フロントエンド**: Next.js 15（**実行時**に環境変数でAPI URLを設定）
- **バックエンド**: Hono + Socket.io（実行時に環境変数で設定）
- **イメージレジストリ**: GitHub Container Registry (ghcr.io)

## 重要な変更点

✨ **1つのイメージで複数環境に対応可能**

フロントエンドは実行時に環境変数（`API_URL`, `BACKEND_URL`）からバックエンドのURLを取得するため、環境ごとに異なるイメージをビルドする必要がありません。

## 環境変数の設定

### 1. Kubernetes環境変数（Backend）

バックエンドは実行時に以下の環境変数を必要とします：

#### 必須

```yaml
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: shin-kojirer-secrets
        key: database-url
  - name: ALLOWED_ORIGINS
    value: 'https://your-frontend-domain.com,https://www.your-frontend-domain.com'
```

#### オプション

```yaml
- name: PORT
  value: '4000'
- name: NODE_ENV
  value: 'production'
```

### 2. Kubernetes環境変数（Frontend）

フロントエンドは**実行時**に以下の環境変数を読み込みます：

#### 必須

```yaml
env:
  - name: API_URL
    value: 'https://api.example.com' # バックエンドAPIのURL
  - name: BACKEND_URL
    value: 'https://api.example.com' # WebSocket接続用のURL
```

#### オプション

```yaml
- name: NODE_ENV
  value: 'production'
- name: PORT
  value: '3000'
```

## イメージのパス

mainブランチにプッシュすると、以下のイメージが自動的にGHCRにプッシュされます：

```
ghcr.io/arcircle/shin-kojirer/backend:latest
ghcr.io/arcircle/shin-kojirer/backend:main-<commit-sha>

ghcr.io/arcircle/shin-kojirer/frontend:latest
ghcr.io/arcircle/shin-kojirer/frontend:main-<commit-sha>
```

## URL構成のパターン

### パターン1: 同じドメイン、異なるパス（推奨）

- フロントエンド: `https://example.com`
- バックエンド: `https://example.com/api`

**Frontend環境変数:**

```yaml
env:
  - name: API_URL
    value: 'https://example.com/api'
  - name: BACKEND_URL
    value: 'https://example.com/api'
```

**Backend環境変数:**

```yaml
env:
  - name: ALLOWED_ORIGINS
    value: 'https://example.com'
```

**Kubernetes Ingress設定例:**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shin-kojirer
  namespace: shin-kojirer
spec:
  rules:
    - host: example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: shin-kojirer-backend
                port:
                  number: 4000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: shin-kojirer-frontend
                port:
                  number: 3000
```

### パターン2: サブドメイン

- フロントエンド: `https://app.example.com`
- バックエンド: `https://api.example.com`

**Frontend環境変数:**

```yaml
env:
  - name: API_URL
    value: 'https://api.example.com'
  - name: BACKEND_URL
    value: 'https://api.example.com'
```

**Backend環境変数:**

```yaml
env:
  - name: ALLOWED_ORIGINS
    value: 'https://app.example.com'
```

**Kubernetes Ingress設定例:**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shin-kojirer
  namespace: shin-kojirer
spec:
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: shin-kojirer-backend
                port:
                  number: 4000
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: shin-kojirer-frontend
                port:
                  number: 3000
```

## Kubernetesマニフェスト参考例

詳細なマニフェストは別リポジトリで管理されていますが、参考として必要な環境変数を示します。

### Backend Deployment（抜粋）

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shin-kojirer-backend
  namespace: shin-kojirer
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: backend
          image: ghcr.io/arcircle/shin-kojirer/backend:latest
          ports:
            - containerPort: 4000
          env:
            - name: NODE_ENV
              value: 'production'
            - name: PORT
              value: '4000'
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: shin-kojirer-secrets
                  key: database-url
            - name: ALLOWED_ORIGINS
              valueFrom:
                configMapKeyRef:
                  name: shin-kojirer-config
                  key: allowed-origins
          livenessProbe:
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 5
            periodSeconds: 5
```

### Frontend Deployment（抜粋）

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shin-kojirer-frontend
  namespace: shin-kojirer
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: frontend
          image: ghcr.io/arcircle/shin-kojirer/frontend:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: 'production'
            - name: PORT
              value: '3000'
            # 実行時にバックエンドURLを指定（重要！）
            - name: API_URL
              value: 'https://api.example.com'
            - name: BACKEND_URL
              value: 'https://api.example.com'
          livenessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
```

## デプロイフロー

1. **コードをmainブランチにプッシュ**

   ```bash
   git push origin main
   ```

2. **GitHub Actionsが自動実行**
   - Backendイメージをビルド → GHCRにプッシュ
   - Frontendイメージをビルド → GHCRにプッシュ
   - ✨ **フロントエンドは環境非依存のイメージになります**

3. **Kubernetesクラスターで新しいイメージをデプロイ**

   ```bash
   # 別リポジトリで環境変数を設定後、デプロイ
   kubectl apply -f shin-kojirer/

   # または、イメージを更新して再起動
   kubectl set image deployment/shin-kojirer-backend backend=ghcr.io/arcircle/shin-kojirer/backend:latest -n shin-kojirer
   kubectl set image deployment/shin-kojirer-frontend frontend=ghcr.io/arcircle/shin-kojirer/frontend:latest -n shin-kojirer

   # ローリングアップデート状況を確認
   kubectl rollout status deployment/shin-kojirer-backend -n shin-kojirer
   kubectl rollout status deployment/shin-kojirer-frontend -n shin-kojirer
   ```

## データベースマイグレーション

新しいバックエンドをデプロイする前にマイグレーションを実行：

```bash
# Backendポッドで実行
kubectl exec -it deployment/shin-kojirer-backend -n shin-kojirer -- npx prisma migrate deploy

# シードデータ投入（初回のみ）
kubectl exec -it deployment/shin-kojirer-backend -n shin-kojirer -- npx prisma db seed
```

## トラブルシューティング

### WebSocket接続エラー

**症状**: フロントエンドからWebSocketに接続できない

**確認事項**:

1. `ALLOWED_ORIGINS` にフロントエンドのURLが含まれているか

   ```bash
   kubectl get configmap shin-kojirer-config -n shin-kojirer -o yaml
   ```

2. IngressでWebSocketのアップグレードが許可されているか
   ```yaml
   annotations:
     nginx.ingress.kubernetes.io/proxy-read-timeout: '3600'
     nginx.ingress.kubernetes.io/proxy-send-timeout: '3600'
     nginx.ingress.kubernetes.io/websocket-services: 'shin-kojirer-backend'
   ```

### フロントエンドのAPI URLが間違っている

**症状**: フロントエンドが間違ったURLに接続しようとする

**原因**: Kubernetes Deploymentの環境変数が設定されていない、または間違っている

**解決策**:

```bash
# ConfigMapまたはDeploymentの環境変数を確認
kubectl get deployment shin-kojirer-frontend -n shin-kojirer -o yaml | grep -A 5 env

# 環境変数を修正してPodを再起動
kubectl set env deployment/shin-kojirer-frontend API_URL=https://api.example.com -n shin-kojirer
kubectl rollout restart deployment/shin-kojirer-frontend -n shin-kojirer
```

### イメージがプルできない

**症状**: `ImagePullBackOff` エラー

**解決策**:

```bash
# GHCRの認証を設定
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_TOKEN \
  --namespace=shin-kojirer

# DeploymentでimagePullSecretsを指定
spec:
  template:
    spec:
      imagePullSecrets:
        - name: ghcr-secret
```

または、GitHubでパッケージを公開設定にする。

## モニタリング

### ログ確認

```bash
# Backendログ
kubectl logs -f deployment/shin-kojirer-backend -n shin-kojirer

# Frontendログ
kubectl logs -f deployment/shin-kojirer-frontend -n shin-kojirer

# 複数Podのログをまとめて表示
kubectl logs -f -l app=shin-kojirer-backend -n shin-kojirer
```

### ヘルスチェック

```bash
# Backendヘルスチェック
kubectl exec -it deployment/shin-kojirer-backend -n shin-kojirer -- curl http://localhost:4000/health

# Podのステータス確認
kubectl get pods -n shin-kojirer
```

## セキュリティ推奨事項

1. **Secrets管理**: `DATABASE_URL`等の機密情報はKubernetes Secretsで管理
2. **HTTPS/TLS**: 本番環境では必ずTLSを使用（Ingress設定）
3. **Network Policies**: 必要な通信のみ許可
4. **RBAC**: 適切なRole-Based Access Controlを設定
5. **イメージスキャン**: 定期的にコンテナイメージの脆弱性スキャンを実行
