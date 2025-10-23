import { NextResponse } from 'next/server';
import { getServerRuntimeConfig } from '@/config/runtime';

// 実行時設定をクライアントに返すAPIエンドポイント
export async function GET() {
  const config = getServerRuntimeConfig();

  console.log('[API /api/config] Returning runtime config:', config);
  console.log('[API /api/config] Environment variables:', {
    API_URL: process.env.API_URL,
    BACKEND_URL: process.env.BACKEND_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
  });

  return NextResponse.json(config, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
