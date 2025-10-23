'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { RuntimeConfig } from '@/config/runtime';
import { setApiBaseUrl } from '@/lib/apiClient';

interface RuntimeConfigContextValue {
  config: RuntimeConfig;
  loading: boolean;
}

const defaultConfig: RuntimeConfig = {
  apiUrl: 'http://localhost:4000',
  backendUrl: 'http://localhost:4000',
};

const RuntimeConfigContext = createContext<RuntimeConfigContextValue>({
  config: defaultConfig,
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
  const initialConfig: RuntimeConfig = {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000',
  };

  const [config, setConfig] = useState<RuntimeConfig>(initialConfig);
  const [loading, setLoading] = useState(true);
  const fallbackConfigRef = useRef(initialConfig);

  useEffect(() => {
    // 実行時設定を取得
    console.log('[RuntimeConfig] Fetching runtime config from /api/config');
    fetch('/api/config')
      .then((res) => {
        console.log('[RuntimeConfig] Response status:', res.status);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: RuntimeConfig) => {
        console.log('[RuntimeConfig] Loaded config:', data);
        setConfig(data);
        // APIクライアントのベースURLを更新
        setApiBaseUrl(data.apiUrl);
        console.log('[RuntimeConfig] API base URL updated to:', data.apiUrl);
        setLoading(false);
      })
      .catch((error) => {
        console.error('[RuntimeConfig] Failed to load runtime config:', error);
        console.error(
          '[RuntimeConfig] Using fallback config:',
          fallbackConfigRef.current
        );
        // フォールバック時も明示的にAPIクライアントを更新
        setApiBaseUrl(fallbackConfigRef.current.apiUrl);
        setLoading(false);
      });
  }, []);

  return (
    <RuntimeConfigContext.Provider value={{ config, loading }}>
      {children}
    </RuntimeConfigContext.Provider>
  );
}
