'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient, Order } from '@/lib/apiClient';
import { useOrderSocket } from '@/hooks/useSocket';
import { useRuntimeConfig } from '@/providers/RuntimeConfigProvider';

export default function OrderStatusPage() {
  const params = useParams();
  const orderId = params.id as string;
  const { loading: configLoading } = useRuntimeConfig();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // WebSocketによるリアルタイム更新
  const { socket, isConnected } = useOrderSocket(orderId);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;

    try {
      const data = await apiClient.getOrder(orderId);
      setOrder(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '注文情報の取得に失敗しました'
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId || configLoading) {
      return;
    }

    loadOrder();

    // WebSocketが接続されていない場合のみポーリング
    if (!isConnected) {
      const interval = setInterval(loadOrder, 5000);
      return () => clearInterval(interval);
    }
  }, [orderId, isConnected, configLoading, loadOrder]);

  // WebSocketイベントリスナー
  useEffect(() => {
    if (socket && orderId) {
      // 注文ステータス更新
      socket.on('order-status-updated', (data) => {
        if (data.orderId === orderId) {
          setOrder((prev) => (prev ? { ...prev, status: data.status } : prev));
          setLastUpdated(new Date());
        }
      });

      // グループステータス更新
      socket.on('group-status-updated', (data) => {
        if (data.orderId === orderId) {
          setOrder((prev) => {
            if (!prev) return prev;
            const updatedGroups = prev.groups.map((group) =>
              group.id === data.groupId
                ? { ...group, status: data.status }
                : group
            );
            return { ...prev, groups: updatedGroups };
          });
          setLastUpdated(new Date());
        }
      });

      // 注文完了通知
      socket.on('order-ready', (data) => {
        if (data.orderId === orderId) {
          // 完了通知の場合、データを再読み込み
          loadOrder();
          setLastUpdated(new Date());
        }
      });

      return () => {
        socket.off('order-status-updated');
        socket.off('group-status-updated');
        socket.off('order-ready');
      };
    }
  }, [socket, orderId, loadOrder]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ORDERED':
        return 'bg-gray-200 text-gray-800';
      case 'PAID':
        return 'bg-blue-200 text-blue-800';
      case 'COOKING':
        return 'bg-orange-200 text-orange-800';
      case 'READY':
        return 'bg-green-200 text-green-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  const getGroupStatusColor = (status: string) => {
    switch (status) {
      case 'NOT_READY':
        return 'bg-gray-100 text-gray-700';
      case 'PREPARING':
        return 'bg-yellow-100 text-yellow-700';
      case 'READY':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ORDERED':
        return '注文受付済み';
      case 'PAID':
        return '支払い済み';
      case 'COOKING':
        return '調理中';
      case 'READY':
        return '準備完了';
      default:
        return status;
    }
  };

  const getGroupStatusText = (status: string) => {
    switch (status) {
      case 'NOT_READY':
        return '準備前';
      case 'PREPARING':
        return '準備中';
      case 'READY':
        return '完成';
      default:
        return status;
    }
  };

  if (loading && !order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">注文が見つかりません</div>
      </div>
    );
  }

  const allGroupsReady = order.groups.every(
    (group) => group.status === 'READY'
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <main className="bg-white rounded-lg shadow-lg p-6">
        {/* ヘッダー */}
        <header className="border-b pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                呼び出し番号: {order.callNum}
              </h1>
              <p className="text-gray-600">注文ID: {order.id}</p>
            </div>
            <div className="text-right">
              <span
                className={`inline-block px-4 py-2 rounded-full font-semibold ${getStatusColor(order.status)}`}
                role="status"
                aria-label={`注文状態: ${getStatusText(order.status)}`}
              >
                {getStatusText(order.status)}
              </span>
            </div>
          </div>
        </header>

        {/* 準備完了の大きな表示 */}
        {allGroupsReady && (
          <section
            className="bg-green-50 border-2 border-green-400 rounded-lg p-8 mb-6 text-center"
            role="alert"
            aria-live="assertive"
            aria-labelledby="order-ready-heading"
          >
            <div className="text-6xl mb-4" role="img" aria-label="料理完成">
              🍜
            </div>
            <h2
              id="order-ready-heading"
              className="text-3xl font-bold text-green-800 mb-2"
            >
              お料理ができました！
            </h2>
            <p className="text-xl text-green-700">
              呼び出し番号{' '}
              <span className="font-bold text-3xl">{order.callNum}</span>{' '}
              番のお客様
            </p>
            <p className="text-lg text-green-600 mt-2">
              カウンターまでお越しください
            </p>
          </section>
        )}

        {/* グループごとの詳細 */}
        <section className="space-y-4" aria-labelledby="order-details-heading">
          <h2 id="order-details-heading" className="text-xl font-semibold mb-3">
            注文内容
          </h2>
          {order.groups.map((group, groupIndex) => (
            <article
              key={group.id}
              className="border rounded-lg p-4"
              aria-labelledby={`group-${group.id}-title`}
            >
              <header className="flex justify-between items-center mb-3">
                <h3 id={`group-${group.id}-title`} className="font-semibold">
                  グループ {groupIndex + 1}
                </h3>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getGroupStatusColor(group.status)}`}
                  role="status"
                  aria-label={`グループ ${groupIndex + 1} の状態: ${getGroupStatusText(group.status)}`}
                >
                  {getGroupStatusText(group.status)}
                </span>
              </header>
              <div className="space-y-2" role="list" aria-label="注文商品">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between text-sm"
                    role="listitem"
                  >
                    <span>{item.merchandise?.name || 'Loading...'}</span>
                    <span
                      aria-label={`価格: ${item.merchandise?.price || 0}円`}
                    >
                      ¥{item.merchandise?.price || 0}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        {/* 合計金額 */}
        <footer className="mt-6 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-xl font-semibold">合計</span>
            <span
              className="text-2xl font-bold"
              aria-label={`合計金額: ${order.groups.reduce(
                (total, group) =>
                  total +
                  group.items.reduce(
                    (groupTotal, item) =>
                      groupTotal + (item.merchandise?.price || 0),
                    0
                  ),
                0
              )}円`}
            >
              ¥
              {order.groups.reduce(
                (total, group) =>
                  total +
                  group.items.reduce(
                    (groupTotal, item) =>
                      groupTotal + (item.merchandise?.price || 0),
                    0
                  ),
                0
              )}
            </span>
          </div>
        </footer>

        {/* 更新時刻と接続状況 */}
        <div
          className="mt-6 text-center text-gray-500 text-sm"
          role="status"
          aria-live="polite"
        >
          <time
            dateTime={lastUpdated.toISOString()}
            aria-label={`最終更新時刻: ${lastUpdated.toLocaleTimeString('ja-JP')}`}
          >
            最終更新: {lastUpdated.toLocaleTimeString('ja-JP')}
          </time>
          <br />
          {isConnected ? (
            <span className="text-green-600" aria-label="リアルタイム更新中">
              🟢 リアルタイム更新中（WebSocket接続済み）
            </span>
          ) : (
            <span className="text-orange-600" aria-label="定期更新中">
              🟡 定期更新中（5秒ごと）
            </span>
          )}
        </div>
      </main>

      {/* ホームへ戻るボタン */}
      <nav className="mt-8 text-center">
        <Link
          href="/"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="ホームページに戻って新しい注文を作成"
        >
          新しい注文を作成
        </Link>
      </nav>
    </div>
  );
}
