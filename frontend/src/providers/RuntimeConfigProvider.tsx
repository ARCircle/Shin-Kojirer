'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { RuntimeConfig } from '@/config/runtime';
import { setApiBaseUrl } from '@/lib/apiClient';

interface RuntimeConfigContextValue {
  config: RuntimeConfig;
  loading: boolean;
}

const RuntimeConfigContext = createContext<RuntimeConfigContextValue>({
  config: {
    apiUrl: 'http://localhost:4000',
    backendUrl: 'http://localhost:4000',
  },
  loading: true,
});

export function useRuntimeConfig() {
  return useContext(RuntimeConfigContext);
}

export function RuntimeConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [config, setConfig] = useState<RuntimeConfig>({
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 実行時設定を取得
    fetch('/api/config')
      .then((res) => res.json())
      .then((data: RuntimeConfig) => {
        setConfig(data);
        // APIクライアントのベースURLを更新
        setApiBaseUrl(data.apiUrl);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load runtime config:', error);
        // フォールバック: ビルド時の環境変数を使用
        setLoading(false);
      });
  }, []);

  return (
    <RuntimeConfigContext.Provider value={{ config, loading }}>
      {children}
    </RuntimeConfigContext.Provider>
  );
}
