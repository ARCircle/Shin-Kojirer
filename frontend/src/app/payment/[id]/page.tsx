'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient, Order } from '@/lib/apiClient';
import { useRuntimeConfig } from '@/providers/RuntimeConfigProvider';

export default function PaymentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { loading: configLoading } = useRuntimeConfig();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getOrder(orderId);
      setOrder(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '注文の読み込みに失敗しました'
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!configLoading) {
      loadOrder();
    }
  }, [configLoading, loadOrder]);

  const handlePayment = async () => {
    if (!order) return;

    try {
      setProcessing(true);
      setError(null);
      await apiClient.payOrder(order.id);
      // 支払い完了後、一覧画面に戻る
      router.push('/payment');
    } catch (err) {
      setError(err instanceof Error ? err.message : '支払い処理に失敗しました');
      setProcessing(false);
    }
  };

  const getTotalPrice = () => {
    if (!order) return 0;
    return order.groups.reduce((total, group) => {
      return (
        total +
        group.items.reduce((groupTotal, item) => {
          return groupTotal + (item.merchandise?.price || 0);
        }, 0)
      );
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div
          role="alert"
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
        >
          {error}
        </div>
        <button
          onClick={() => router.push('/payment')}
          className="text-blue-600 hover:underline"
        >
          ← 一覧に戻る
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <p className="text-gray-500">注文が見つかりません</p>
        <button
          onClick={() => router.push('/payment')}
          className="text-blue-600 hover:underline mt-4"
        >
          ← 一覧に戻る
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <button
        onClick={() => router.push('/payment')}
        className="text-blue-600 hover:underline mb-6"
      >
        ← 一覧に戻る
      </button>

      <header className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-blue-600 text-white rounded-full w-20 h-20 flex items-center justify-center">
            <span className="text-3xl font-bold">{order.callNum}</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold">注文詳細</h1>
            <p className="text-sm text-gray-600 mt-1">注文ID: {order.id}</p>
            <p className="text-sm text-gray-600">
              作成日時: {new Date(order.createdAt).toLocaleString('ja-JP')}
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
        >
          {error}
        </div>
      )}

      <main>
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">注文内容</h2>
          <div className="space-y-4">
            {order.groups.map((group, groupIndex) => (
              <div key={group.id} className="border-b pb-4 last:border-b-0">
                <h3 className="font-semibold mb-2 text-gray-700">
                  グループ {groupIndex + 1}
                  <span
                    className={`ml-3 text-sm px-2 py-1 rounded ${
                      group.status === 'READY'
                        ? 'bg-green-100 text-green-800'
                        : group.status === 'PREPARING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {group.status === 'READY'
                      ? '完成'
                      : group.status === 'PREPARING'
                        ? '調理中'
                        : '未調理'}
                  </span>
                </h3>
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex justify-between items-center bg-gray-50 p-3 rounded"
                    >
                      <span className="font-medium">
                        {item.merchandise?.name || '不明'}
                      </span>
                      <span className="text-gray-700">
                        ¥{(item.merchandise?.price || 0).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <span className="text-2xl font-semibold">合計金額</span>
            <span className="text-3xl font-bold text-blue-600">
              ¥{getTotalPrice().toLocaleString()}
            </span>
          </div>

          <button
            onClick={handlePayment}
            disabled={processing || order.status !== 'ORDERED'}
            className="w-full bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold text-lg transition-colors"
          >
            {processing
              ? '処理中...'
              : order.status !== 'ORDERED'
                ? 'この注文は支払い済みです'
                : '支払い完了にする'}
          </button>

          {order.status !== 'ORDERED' && (
            <p className="text-center text-sm text-gray-600 mt-2">
              ステータス: {order.status}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
