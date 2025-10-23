// 実行時に取得できる設定
// サーバー側で環境変数を読み込み、クライアントに公開する

export interface RuntimeConfig {
  apiUrl: string;
  backendUrl: string;
}

// サーバーサイドで環境変数から設定を取得
export function getServerRuntimeConfig(): RuntimeConfig {
  return {
    apiUrl:
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:4000',
    backendUrl:
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'http://localhost:4000',
  };
}
