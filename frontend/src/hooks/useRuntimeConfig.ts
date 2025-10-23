'use client';

import { useEffect, useState } from 'react';
import { RuntimeConfig } from '@/config/runtime';

// クライアント側で実行時設定を取得するフック
export function useRuntimeConfig() {
  const [config, setConfig] = useState<RuntimeConfig>({
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 実行時設定を取得
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        setConfig(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load runtime config:', error);
        // フォールバック: ビルド時の環境変数を使用
        setLoading(false);
      });
  }, []);

  return { config, loading };
}
