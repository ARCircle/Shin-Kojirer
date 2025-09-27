'use client';

import { useState, useEffect } from 'react';
import { apiClient, Order } from '@/lib/apiClient';
import { useKitchenSocket } from '@/hooks/useSocket';

interface OrderWithGroups extends Order {
  groups: Array<{
    id: string;
    status: string;
    items: Array<{
      id: string;
      merchandiseId: string;
      merchandise?: {
        id: string;
        name: string;
        price: number;
        type: string;
      };
    }>;
  }>;
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<OrderWithGroups[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // WebSocketによるリアルタイム更新
  const { socket, isConnected } = useKitchenSocket();

  useEffect(() => {
    loadOrders();
    // ポーリングで定期的に更新
    const interval = setInterval(loadOrders, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    try {
      // 簡易実装: 最近の注文を全て取得（実際はバックエンドで専用エンドポイントが必要）
      // ここでは仮にローカルストレージから最近の注文IDを取得
      const recentOrderIds = JSON.parse(
        localStorage.getItem('recentOrders') || '[]'
      ).slice(0, 20);

      const orderPromises = recentOrderIds.map((id: string) =>
        apiClient.getOrder(id).catch(() => null)
      );

      const fetchedOrders = await Promise.all(orderPromises);
      const validOrders = fetchedOrders.filter(
        (order): order is OrderWithGroups =>
          order !== null && order.status !== 'READY'
      );

      setOrders(
        validOrders.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '注文の読み込みに失敗しました'
      );
    }
  };

  const updateGroupStatus = async (
    groupId: string,
    newStatus: 'PREPARING' | 'READY'
  ) => {
    try {
      setLoading(true);
      if (newStatus === 'PREPARING') {
        await apiClient.prepareGroup(groupId);
      } else if (newStatus === 'READY') {
        await apiClient.markGroupReady(groupId);
      }
      await loadOrders(); // 更新後にリロード
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'ステータスの更新に失敗しました'
      );
    } finally {
      setLoading(false);
    }
  };

  const getGroupStatusColor = (status: string) => {
    switch (status) {
      case 'NOT_READY':
        return 'bg-gray-100 border-gray-300';
      case 'PREPARING':
        return 'bg-yellow-100 border-yellow-400';
      case 'READY':
        return 'bg-green-100 border-green-400';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">キッチンディスプレイ</h1>
        <p className="text-gray-600">調理状況の管理</p>
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
              現在、処理待ちの注文はありません
            </p>
          </div>
        ) : (
          <section
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            aria-label="注文一覧"
          >
            {orders.map((order) => (
              <article
                key={order.id}
                className="bg-white rounded-lg shadow-md p-4"
              >
                <header className="border-b pb-3 mb-3">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">#{order.callNum}</h2>
                    <time
                      className="text-sm text-gray-600"
                      dateTime={order.createdAt}
                      aria-label={`注文時刻: ${new Date(order.createdAt).toLocaleTimeString('ja-JP')}`}
                    >
                      {new Date(order.createdAt).toLocaleTimeString('ja-JP')}
                    </time>
                  </div>
                </header>

                {order.groups.map((group, groupIndex) => (
                  <section
                    key={group.id}
                    className={`border-2 rounded-lg p-3 mb-3 ${getGroupStatusColor(group.status)}`}
                    aria-labelledby={`group-${group.id}-title`}
                  >
                    <div className="mb-2">
                      <h3
                        id={`group-${group.id}-title`}
                        className="font-semibold text-sm"
                      >
                        グループ {groupIndex + 1}
                      </h3>
                    </div>

                    <div
                      className="text-sm mb-3"
                      role="list"
                      aria-label="注文商品"
                    >
                      {group.items.map((item) => (
                        <div key={item.id} className="py-1" role="listitem">
                          • {item.merchandise?.name || 'Loading...'}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      {group.status === 'NOT_READY' && (
                        <button
                          onClick={() =>
                            updateGroupStatus(group.id, 'PREPARING')
                          }
                          disabled={loading}
                          className="flex-1 bg-yellow-500 text-white px-3 py-2 rounded text-sm font-medium hover:bg-yellow-600 disabled:bg-gray-400 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                          aria-label={`グループ ${groupIndex + 1} の調理を開始`}
                        >
                          調理開始
                        </button>
                      )}
                      {group.status === 'PREPARING' && (
                        <button
                          onClick={() => updateGroupStatus(group.id, 'READY')}
                          disabled={loading}
                          className="flex-1 bg-green-500 text-white px-3 py-2 rounded text-sm font-medium hover:bg-green-600 disabled:bg-gray-400 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                          aria-label={`グループ ${groupIndex + 1} を完成にマーク`}
                        >
                          完成
                        </button>
                      )}
                      {group.status === 'READY' && (
                        <div
                          className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm font-medium text-center"
                          role="status"
                          aria-label={`グループ ${groupIndex + 1} は提供準備完了`}
                        >
                          ✓ 提供可能
                        </div>
                      )}
                    </div>
                  </section>
                ))}
              </article>
            ))}
          </section>
        )}

        <div
          className="mt-8 text-center text-gray-500 text-sm"
          role="status"
          aria-live="polite"
        >
          2秒ごとに自動更新されます
        </div>
      </main>
    </div>
  );
}
