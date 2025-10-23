'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, Merchandise, CreateOrderInput } from '@/lib/apiClient';
import { useRuntimeConfig } from '@/providers/RuntimeConfigProvider';

interface CartItem {
  merchandiseId: string;
  merchandise: Merchandise;
  quantity: number;
}

export default function Home() {
  const router = useRouter();
  const { loading: configLoading } = useRuntimeConfig();
  const [merchandise, setMerchandise] = useState<Merchandise[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasClickedRT, setHasClickedRT] = useState(false);

  useEffect(() => {
    // 設定の読み込みが完了してからAPIリクエストを実行
    if (!configLoading) {
      loadMerchandise();
    }
  }, [configLoading]);

  const loadMerchandise = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getMerchandise();
      setMerchandise(data.filter((item) => item.isAvailable));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '商品の読み込みに失敗しました'
      );
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: Merchandise) => {
    setCart((prev) => {
      const existing = prev.find(
        (cartItem) => cartItem.merchandiseId === item.id
      );
      if (existing) {
        return prev.map((cartItem) =>
          cartItem.merchandiseId === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [
        ...prev,
        { merchandiseId: item.id, merchandise: item, quantity: 1 },
      ];
    });
  };

  const removeFromCart = (merchandiseId: string) => {
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.merchandiseId === merchandiseId
      );
      if (!existing || existing.quantity <= 1) {
        return prev.filter((item) => item.merchandiseId !== merchandiseId);
      }
      return prev.map((item) =>
        item.merchandiseId === merchandiseId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      );
    });
  };

  const getTotalPrice = () => {
    return cart.reduce(
      (total, item) => total + item.merchandise.price * item.quantity,
      0
    );
  };

  const createOrder = async () => {
    if (cart.length === 0) return;

    try {
      setLoading(true);

      // カートアイテムをグループごとに整理
      const baseItems = cart.filter(
        (item) => item.merchandise.type === 'BASE_ITEM'
      );
      const toppings = cart.filter(
        (item) => item.merchandise.type === 'TOPPING'
      );
      const discounts = cart.filter(
        (item) => item.merchandise.type === 'DISCOUNT'
      );

      const groups: CreateOrderInput['groups'] = [];

      // BASE_ITEMごとにグループを作成
      baseItems.forEach((baseItem) => {
        for (let i = 0; i < baseItem.quantity; i++) {
          const group = {
            items: [{ merchandiseId: baseItem.merchandiseId }],
          };
          groups.push(group);
        }
      });

      // トッピングとディスカウントを最初のグループに追加（簡易実装）
      if (groups.length > 0) {
        toppings.forEach((topping) => {
          for (let i = 0; i < topping.quantity && i < groups.length; i++) {
            groups[i].items.push({ merchandiseId: topping.merchandiseId });
          }
        });

        discounts.forEach((discount) => {
          for (let i = 0; i < discount.quantity && i < groups.length; i++) {
            groups[i].items.push({ merchandiseId: discount.merchandiseId });
          }
        });
      }

      const order = await apiClient.createOrder({ groups });

      // ローカルストレージに注文IDを保存（キッチンページ用）
      const recentOrders = JSON.parse(
        localStorage.getItem('recentOrders') || '[]'
      );
      recentOrders.unshift(order.id);
      localStorage.setItem(
        'recentOrders',
        JSON.stringify(recentOrders.slice(0, 50))
      );

      // 注文状況ページへ遷移
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '注文の作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleRTClick = () => {
    setHasClickedRT(true);
    // Twitter Intent Linkを開く
    window.open(
      `https://twitter.com/intent/retweet?tweet_id=1853006034664923354`,
      '_blank'
    );
  };

  const applyRTCoupon = () => {
    if (!hasClickedRT) return;

    // RTクーポンを探す
    const rtCoupon = merchandise.find(
      (m) => m.name === 'RTクーポン（トッピング1つ無料）'
    );
    if (rtCoupon) {
      addToCart(rtCoupon);
    }
  };

  const groupedMerchandise = {
    baseItems: merchandise.filter((m) => m.type === 'BASE_ITEM'),
    toppings: merchandise.filter((m) => m.type === 'TOPPING'),
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
      <header>
        <h1 className="text-3xl font-bold mb-8">注文画面</h1>
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

      <main className="grid md:grid-cols-3 gap-8">
        <section
          className="md:col-span-2"
          aria-labelledby="merchandise-section"
        >
          {/* メイン商品 */}
          <section className="mb-8" aria-labelledby="base-items-heading">
            <h2 id="base-items-heading" className="text-xl font-semibold mb-4">
              メイン商品
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="list">
              {groupedMerchandise.baseItems.map((item) => (
                <article
                  key={item.id}
                  className="border rounded-lg p-4"
                  role="listitem"
                >
                  <h3 className="font-semibold">{item.name}</h3>
                  <p
                    className="text-gray-600"
                    aria-label={`価格 ${item.price}円`}
                  >
                    ¥{item.price}
                  </p>
                  <button
                    onClick={() => addToCart(item)}
                    className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label={`${item.name}をカートに追加`}
                  >
                    カートに追加
                  </button>
                </article>
              ))}
            </div>
          </section>

          {/* トッピング */}
          {groupedMerchandise.toppings.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">トッピング</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {groupedMerchandise.toppings.map((item) => (
                  <div key={item.id} className="border rounded-lg p-3">
                    <h3 className="font-medium text-sm">{item.name}</h3>
                    <p className="text-gray-600 text-sm">¥{item.price}</p>
                    <button
                      onClick={() => addToCart(item)}
                      className="mt-2 bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                    >
                      追加
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RTクーポン */}
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-3 text-blue-900">
              🎁 特別キャンペーン
            </h2>
            <p className="text-sm text-gray-700 mb-4">
              ツイートをRTして、トッピング1つ無料クーポンをゲット！
            </p>
            {!hasClickedRT ? (
              <button
                onClick={handleRTClick}
                className="w-full bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 font-semibold flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
                ツイートをRTしてクーポンGET
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg text-sm">
                  ✅ RTありがとうございます！クーポンを適用できます
                </div>
                <button
                  onClick={applyRTCoupon}
                  className="w-full bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 font-semibold"
                >
                  クーポンを適用する（トッピング1つ無料）
                </button>
              </div>
            )}
          </div>
        </section>

        {/* カート */}
        <div className="md:col-span-1">
          <div className="sticky top-4 border rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">カート</h2>

            {cart.length === 0 ? (
              <p className="text-gray-500">カートは空です</p>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {cart.map((item) => (
                    <div
                      key={item.merchandiseId}
                      className="flex justify-between items-center"
                    >
                      <div className="flex-1">
                        <span className="font-medium">
                          {item.merchandise.name}
                        </span>
                        <span className="text-sm text-gray-600 ml-2">
                          ×{item.quantity}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          ¥{item.merchandise.price * item.quantity}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.merchandiseId)}
                          className="text-red-500 hover:text-red-700"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold">合計</span>
                    <span className="text-xl font-bold">
                      ¥{getTotalPrice()}
                    </span>
                  </div>

                  <button
                    onClick={createOrder}
                    disabled={loading || cart.length === 0}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    注文する
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
