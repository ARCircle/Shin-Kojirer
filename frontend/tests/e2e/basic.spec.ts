import { test, expect } from '@playwright/test';

test.describe('基本的な機能テスト', () => {
  test('ホームページが正常に表示される', async ({ page }) => {
    await page.goto('http://localhost:3002/');

    // ページタイトルを確認
    await expect(page.locator('h1')).toContainText('注文画面');

    // カートセクションが表示されることを確認
    await expect(page.locator('h2:has-text("カート")')).toBeVisible();
  });

  test('管理ページが正常に表示される', async ({ page }) => {
    await page.goto('http://localhost:3002/admin');

    // ページタイトルを確認
    await expect(page.locator('h1')).toContainText('商品管理');

    // 新規商品フォームが表示されることを確認
    await expect(page.locator('text=新規商品を追加')).toBeVisible();
  });

  test('キッチンページが正常に表示される', async ({ page }) => {
    await page.goto('http://localhost:3002/kitchen');

    // ページタイトルを確認
    await expect(page.locator('h1')).toContainText('キッチンディスプレイ');
  });

  test('商品作成の基本フロー', async ({ page }) => {
    // 管理ページに移動
    await page.goto('http://localhost:3002/admin');

    // 商品情報を入力
    await page.fill('input[type="text"]:first-of-type', 'テスト商品');
    await page.fill('input[type="number"]:first-of-type', '500');
    await page.selectOption('select:first-of-type', 'BASE_ITEM');

    // フォームを送信
    await page.click('button[type="submit"]:first-of-type');

    // 商品が作成されたことを確認（ページリロードやテーブル更新を待つ）
    await page.waitForTimeout(3000);

    // 商品リストが更新されるまで待機
    await page.waitForLoadState('networkidle');

    // メイン商品セクション内のテーブルでテスト商品を確認
    await expect(
      page
        .locator('div:has(h2:has-text("メイン商品"))')
        .locator('table')
        .locator('td:has-text("テスト商品")')
    ).toBeVisible({
      timeout: 15000,
    });
  });
});
