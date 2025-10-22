'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, Order } from '@/lib/apiClient';
import { usePaymentSocket } from '@/hooks/useSocket';

export default function PaymentPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // WebSocketによるリアルタイム更新
  const { socket, isConnected } = usePaymentSocket();

  useEffect(() => {
    loadOrders();
  }, []);

  // WebSocketイベントリスナーの設定
  useEffect(() => {
    if (!socket) return;

    // 新規注文が作成された時
    const handleOrderCreated = (data: {
      orderId: string;
      callNum: number;
      status: string;
      groups: unknown[];
      createdAt: string;
    }) => {
      console.log('New order created:', data);
      // ORDERED状態の注文のみ追加
      if (data.status === 'ORDERED') {
        const newOrder: Order = {
          id: data.orderId,
          callNum: data.callNum,
          status: data.status as Order['status'],
          groups: data.groups as Order['groups'],
          createdAt: data.createdAt,
          updatedAt: data.createdAt,
        };

        setOrders((prev) => {
          // 既存の注文に同じIDがあれば重複を防ぐ
          if (prev.some((order) => order.id === newOrder.id)) {
            return prev;
          }
          // 新しい順にソートして追加
          return [newOrder, ...prev].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
      }
    };

    // 注文ステータスが更新された時
    const handleOrderStatusUpdated = (data: {
      orderId: string;
      status: string;
      timestamp: string;
    }) => {
      console.log('Order status updated:', data);
      // ORDERED以外になったら一覧から削除
      if (data.status !== 'ORDERED') {
        setOrders((prev) => prev.filter((order) => order.id !== data.orderId));
      }
    };

    socket.on('order-created', handleOrderCreated);
    socket.on('order-status-updated', handleOrderStatusUpdated);

    return () => {
      socket.off('order-created', handleOrderCreated);
      socket.off('order-status-updated', handleOrderStatusUpdated);
    };
  }, [socket]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      // ORDERED状態（未払い）の注文のみを取得
      const data = await apiClient.getAllOrders({ status: 'ORDERED' });
      // 作成日時の新しい順にソート
      const sortedData = data.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setOrders(sortedData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '注文の読み込みに失敗しました'
      );
    } finally {
      setLoading(false);
    }
  };

  const getTotalPrice = (order: Order) => {
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">支払い一覧（オペレーター用）</h1>
            <p className="text-gray-600 mt-2">
              未払いの注文を選択して詳細画面から支払い処理を行います
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}
              title={isConnected ? 'リアルタイム更新中' : '未接続'}
            />
            <span className="text-sm text-gray-600">
              {isConnected ? 'リアルタイム更新中' : '未接続'}
            </span>
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
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              現在、支払い待ちの注文はありません
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {orders.map((order) => (
              <article
                key={order.id}
                onClick={() => router.push(`/payment/${order.id}`)}
                className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-blue-400"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center">
                      <span className="text-2xl font-bold">
                        {order.callNum}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleString('ja-JP')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        注文ID: {order.id}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">合計金額</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ¥{getTotalPrice(order).toLocaleString()}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
