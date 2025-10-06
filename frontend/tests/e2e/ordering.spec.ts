import { test, expect } from '@playwright/test';

// quickstart.mdに基づくE2Eテストシナリオ
test.describe('注文システム E2E テスト', () => {
  test.beforeEach(async ({ page }) => {
    // ページが完全に読み込まれるまで待機するためのナビゲーション処理
    await page.goto('http://localhost:3002/admin', {
      waitUntil: 'networkidle',
    });

    // ページのタイトルが読み込まれるまで待機
    await page.waitForSelector('h1', { timeout: 10000 });

    // フォームの最初の入力フィールドを特定してクリア
    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.fill('特製ラーメン');

    const priceInput = page.locator('input[type="number"]').first();
    await priceInput.fill('800');

    const typeSelect = page.locator('select').first();
    await typeSelect.selectOption('BASE_ITEM');

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // 少し待ってから次の商品を作成
    await page.waitForTimeout(2000);

    // チャーシューを作成
    await nameInput.fill('チャーシュー');
    await priceInput.fill('150');
    await typeSelect.selectOption('TOPPING');
    await submitButton.click();

    await page.waitForTimeout(2000);

    // SNS割引を作成
    await nameInput.fill('SNS割引');
    await priceInput.fill('-50');
    await typeSelect.selectOption('DISCOUNT');
    await submitButton.click();

    await page.waitForTimeout(2000);
  });

  test('完全な注文フロー: 注文作成→支払い→調理→受け取り', async ({
    page,
    context,
  }) => {
    // 1. 顧客が注文ページにアクセス
    await page.goto('http://localhost:3002/');

    // ページが読み込まれるまで待機
    await expect(page.locator('h1')).toContainText('注文画面');

    // 商品が表示されるまで待機
    await page.waitForSelector('text=特製ラーメン', { timeout: 10000 });

    // 2. 特製ラーメンをカートに追加
    await page.click(
      'text=特製ラーメン >> .. >> button:has-text("カートに追加")'
    );

    // 3. チャーシューをカートに追加
    await page.click('text=チャーシュー >> .. >> button:has-text("追加")');

    // 4. SNS割引を適用
    await page.click('text=SNS割引 >> .. >> button:has-text("適用")');

    // カートの合計を確認（800 + 150 - 50 = 900円）
    await expect(page.locator('text=¥900')).toBeVisible();

    // 5. 注文して支払う
    await page.click('button:has-text("注文して支払う")');

    // 注文状況ページに遷移することを確認
    await expect(page).toHaveURL(/\/orders\/[a-f0-9-]+/);

    // 呼び出し番号が表示されることを確認
    await expect(page.locator('text=呼び出し番号:')).toBeVisible();

    // 注文状況ページに遷移したことを確認

    // 6. キッチンページを新しいタブで開く
    const kitchenPage = await context.newPage();
    await kitchenPage.goto('http://localhost:3002/kitchen');

    // 注文がキッチンに表示されることを確認（呼び出し番号で確認）
    await expect(kitchenPage.locator('text=#').first()).toBeVisible({
      timeout: 10000,
    });

    // 7. キッチンで調理開始
    await kitchenPage.click('button:has-text("調理開始")');

    // 顧客ページで状態更新を確認
    await page.waitForTimeout(3000); // ポーリング待機
    await expect(page.locator('text=準備中')).toBeVisible({ timeout: 10000 });

    // 8. キッチンで調理完了
    await kitchenPage.click('button:has-text("完成")');

    // 9. 顧客ページで完成通知を確認
    await page.waitForTimeout(3000); // ポーリング待機
    await expect(page.locator('text=お料理ができました')).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.locator('text=カウンターまでお越しください')
    ).toBeVisible();

    // 注文内容の詳細確認
    await expect(page.locator('text=特製ラーメン')).toBeVisible();
    await expect(page.locator('text=チャーシュー')).toBeVisible();
    await expect(page.locator('text=SNS割引')).toBeVisible();

    await kitchenPage.close();
  });

  test('複数グループの注文処理', async ({ page }) => {
    // メインページに移動
    await page.goto('http://localhost:3002/');

    // 商品が読み込まれるまで待機
    await page.waitForSelector('text=特製ラーメン', { timeout: 10000 });

    // 特製ラーメンを2個カートに追加
    await page.click(
      'text=特製ラーメン >> .. >> button:has-text("カートに追加")'
    );
    await page.click(
      'text=特製ラーメン >> .. >> button:has-text("カートに追加")'
    );

    // チャーシューを1個追加
    await page.click('text=チャーシュー >> .. >> button:has-text("追加")');

    // 合計が正しいことを確認（800*2 + 150 = 1750円）
    await expect(page.locator('text=¥1750')).toBeVisible();

    // 注文を確定
    await page.click('button:has-text("注文して支払う")');

    // 注文状況ページで複数グループが表示されることを確認
    await expect(page.locator('text=グループ 1')).toBeVisible();
    await expect(page.locator('text=グループ 2')).toBeVisible();
  });
});

test.describe('エラーハンドリング', () => {
  test('空のカートで注文しようとした場合', async ({ page }) => {
    await page.goto('http://localhost:3002/');

    // ページが完全に読み込まれるまで待機
    await page.waitForLoadState('networkidle');

    // カートセクションが表示されるまで待機
    await expect(page.locator('h2:has-text("カート")')).toBeVisible();

    // 注文ボタンが無効化されていることを確認
    const orderButton = page.locator('button:has-text("注文して支払う")');
    await expect(orderButton).toBeDisabled();
  });
});

test.describe('管理機能', () => {
  test('商品管理画面での操作', async ({ page }) => {
    await page.goto('http://localhost:3002/admin');

    // 商品管理ページが表示されることを確認
    await expect(page.locator('h1')).toContainText('商品管理');

    // 新規商品フォームが表示されることを確認
    await expect(page.locator('text=新規商品を追加')).toBeVisible();

    // 既存商品のテーブルが表示されることを確認
    await expect(page.locator('h2:has-text("メイン商品")')).toBeVisible();
  });
});
