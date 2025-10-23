import { NextResponse } from 'next/server';
import { getServerRuntimeConfig } from '@/config/runtime';

// 実行時設定をクライアントに返すAPIエンドポイント
export async function GET() {
  const config = getServerRuntimeConfig();

  return NextResponse.json(config, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
