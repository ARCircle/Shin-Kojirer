'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient, Merchandise } from '@/lib/apiClient';
import { useRuntimeConfig } from '@/providers/RuntimeConfigProvider';

export default function AdminPage() {
  const { loading: configLoading } = useRuntimeConfig();
  const [merchandise, setMerchandise] = useState<Merchandise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({
    name: '',
    price: 0,
    type: 'BASE_ITEM' as 'BASE_ITEM' | 'TOPPING' | 'DISCOUNT',
    isAvailable: true,
  });

  const loadMerchandise = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getMerchandise();
      setMerchandise(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '商品の読み込みに失敗しました'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!configLoading) {
      loadMerchandise();
    }
  }, [configLoading, loadMerchandise]);

  const handleCreateMerchandise = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await apiClient.createMerchandise(newItem);
      await loadMerchandise();
      setNewItem({
        name: '',
        price: 0,
        type: 'BASE_ITEM',
        isAvailable: true,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '商品の作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handlePriceUpdate = async (id: string, newPrice: number) => {
    try {
      setLoading(true);
      await apiClient.setMerchandisePrice(id, newPrice);
      await loadMerchandise();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '価格の更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const groupedMerchandise = {
    baseItems: merchandise.filter((m) => m.type === 'BASE_ITEM'),
    toppings: merchandise.filter((m) => m.type === 'TOPPING'),
    discounts: merchandise.filter((m) => m.type === 'DISCOUNT'),
  };

  if (loading && merchandise.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <header>
        <h1 className="text-3xl font-bold mb-8">商品管理</h1>
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
        {/* 新規商品追加フォーム */}
        <section
          className="bg-white rounded-lg shadow-md p-6 mb-8"
          aria-labelledby="add-product-heading"
        >
          <h2 id="add-product-heading" className="text-xl font-semibold mb-4">
            新規商品を追加
          </h2>
          <form
            onSubmit={handleCreateMerchandise}
            className="space-y-4"
            aria-label="新規商品追加フォーム"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label
                  htmlFor="product-name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  商品名
                </label>
                <input
                  id="product-name"
                  type="text"
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, name: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  aria-describedby="product-name-help"
                  required
                />
                <span id="product-name-help" className="sr-only">
                  商品の名前を入力してください
                </span>
              </div>
              <div>
                <label
                  htmlFor="product-price"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  価格
                </label>
                <input
                  id="product-price"
                  type="number"
                  value={newItem.price}
                  onChange={(e) =>
                    setNewItem({ ...newItem, price: Number(e.target.value) })
                  }
                  className="w-full border rounded px-3 py-2"
                  aria-describedby="product-price-help"
                  min="0"
                  required
                />
                <span id="product-price-help" className="sr-only">
                  商品の価格を円単位で入力してください
                </span>
              </div>
              <div>
                <label
                  htmlFor="product-type"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  タイプ
                </label>
                <select
                  id="product-type"
                  value={newItem.type}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      type: e.target.value as
                        | 'BASE_ITEM'
                        | 'TOPPING'
                        | 'DISCOUNT',
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                  aria-describedby="product-type-help"
                >
                  <option value="BASE_ITEM">メイン商品</option>
                  <option value="TOPPING">トッピング</option>
                  <option value="DISCOUNT">割引</option>
                </select>
                <span id="product-type-help" className="sr-only">
                  商品の種類を選択してください
                </span>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="新規商品を追加"
                >
                  {loading ? '追加中...' : '追加'}
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* 既存商品一覧 */}
        <section
          className="space-y-8"
          aria-labelledby="existing-products-heading"
        >
          <h2 id="existing-products-heading" className="sr-only">
            既存商品一覧
          </h2>
          {/* メイン商品 */}
          <div>
            <h3 className="text-xl font-semibold mb-4">メイン商品</h3>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table
                className="w-full"
                role="table"
                aria-label="メイン商品一覧"
              >
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      商品名
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      価格
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      利用可能
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groupedMerchandise.baseItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          defaultValue={item.price}
                          onBlur={(e) =>
                            handlePriceUpdate(item.id, Number(e.target.value))
                          }
                          className="w-24 border rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            item.isAvailable
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.isAvailable ? '利用可能' : '利用不可'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handlePriceUpdate(item.id, item.price)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          価格更新
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* トッピング */}
          {groupedMerchandise.toppings.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">トッピング</h2>
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        商品名
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        価格
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        利用可能
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {groupedMerchandise.toppings.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            defaultValue={item.price}
                            onBlur={(e) =>
                              handlePriceUpdate(item.id, Number(e.target.value))
                            }
                            className="w-24 border rounded px-2 py-1"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 rounded text-sm ${
                              item.isAvailable
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {item.isAvailable ? '利用可能' : '利用不可'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() =>
                              handlePriceUpdate(item.id, item.price)
                            }
                            className="text-blue-600 hover:text-blue-900"
                          >
                            価格更新
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 割引 */}
          {groupedMerchandise.discounts.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">割引</h2>
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        商品名
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        価格
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        利用可能
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {groupedMerchandise.discounts.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            defaultValue={item.price}
                            onBlur={(e) =>
                              handlePriceUpdate(item.id, Number(e.target.value))
                            }
                            className="w-24 border rounded px-2 py-1 text-red-600"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 rounded text-sm ${
                              item.isAvailable
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {item.isAvailable ? '利用可能' : '利用不可'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() =>
                              handlePriceUpdate(item.id, item.price)
                            }
                            className="text-blue-600 hover:text-blue-900"
                          >
                            価格更新
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
