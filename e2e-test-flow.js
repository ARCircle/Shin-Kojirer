// スマホ完結型注文・会計・呼び出しシステム E2Eテスト
// 主要フローを包括的にテスト

const { chromium } = require('playwright');

async function runE2ETest() {
  console.log('🚀 スマホ完結型注文システム E2Eテスト開始');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000, // 操作をゆっくり実行してフローを確認
  });

  const context = await browser.newContext({
    viewport: { width: 375, height: 812 }, // iPhone 13 サイズ
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  });

  const page = await context.newPage();

  try {
    // 1. ホームページにアクセス
    console.log('📱 1. ホームページアクセス');
    await page.goto('http://localhost:3003');
    await page.waitForLoadState('networkidle');

    // 商品が表示されているか確認
    await page.waitForSelector('h1:has-text("注文画面")');
    console.log('✅ ホームページ正常表示');

    // 2. 商品選択（醤油ラーメン + チャーシュー + 学生割引）
    console.log('🍜 2. 商品選択');

    // 醤油ラーメンを追加
    await page.click(
      'button:has-text("カートに追加"):near(h3:has-text("醤油ラーメン"))'
    );
    console.log('✅ 醤油ラーメン追加');

    // トッピング（チャーシュー）を追加
    await page.click(
      'button:has-text("追加"):near(h3:has-text("チャーシュー"))'
    );
    console.log('✅ チャーシュー追加');

    // 割引（学生割引）を適用
    await page.click('button:has-text("適用"):near(h3:has-text("学生割引"))');
    console.log('✅ 学生割引適用');

    // カートの内容確認
    await page.waitForSelector('text=醤油ラーメン');
    await page.waitForSelector('text=チャーシュー');
    await page.waitForSelector('text=学生割引');
    console.log('✅ カート内容確認完了');

    // 合計金額確認（800 + 200 - 100 = 900円）
    await page.waitForSelector('text=¥900');
    console.log('✅ 合計金額確認（¥900）');

    // 3. 注文実行
    console.log('💳 3. 注文実行');
    await page.click('button:has-text("注文して支払う")');

    // 注文状況ページに遷移するまで待機
    await page.waitForURL('**/orders/**');
    console.log('✅ 注文状況ページ遷移');

    // 呼び出し番号の表示確認
    await page.waitForSelector('h1:has-text("呼び出し番号:")');
    const callNumber = await page.textContent('h1:has-text("呼び出し番号:")');
    console.log(`✅ 呼び出し番号表示: ${callNumber}`);

    // 注文内容確認
    await page.waitForSelector('text=醤油ラーメン');
    await page.waitForSelector('text=チャーシュー');
    await page.waitForSelector('text=学生割引');
    console.log('✅ 注文内容確認完了');

    // 4. キッチンディスプレイページのテスト
    console.log('👨‍🍳 4. キッチンディスプレイテスト');

    // 新しいタブでキッチンページを開く
    const kitchenPage = await context.newPage();
    await kitchenPage.goto('http://localhost:3003/kitchen');
    await kitchenPage.waitForLoadState('networkidle');

    // キッチンディスプレイの表示確認
    await kitchenPage.waitForSelector('h1:has-text("キッチンディスプレイ")');
    console.log('✅ キッチンディスプレイ表示');

    // 注文カードの確認
    await kitchenPage.waitForSelector('h2:has-text("#1")'); // 呼び出し番号1の注文
    console.log('✅ 注文カード表示確認');

    // 調理開始ボタンをクリック
    await kitchenPage.click('button:has-text("調理開始")');
    console.log('✅ 調理開始');

    // 完成ボタンをクリック
    await kitchenPage.click('button:has-text("完成")');
    console.log('✅ 調理完成');

    // 5. 注文状況ページでの完成通知確認
    console.log('🎉 5. 完成通知確認');

    // 元の注文状況ページに戻る
    await page.bringToFront();

    // 完成通知の表示を待機（リアルタイム更新）
    await page.waitForSelector('h2:has-text("お料理ができました！")', {
      timeout: 10000,
    });
    console.log('✅ 完成通知表示確認');

    // 呼び出し案内の確認
    await page.waitForSelector('text=カウンターまでお越しください');
    console.log('✅ 呼び出し案内表示');

    // 6. 管理ページのテスト
    console.log('⚙️ 6. 管理ページテスト');

    const adminPage = await context.newPage();
    await adminPage.goto('http://localhost:3003/admin');
    await adminPage.waitForLoadState('networkidle');

    // 管理ページの表示確認
    await adminPage.waitForSelector('h1:has-text("商品管理")');
    console.log('✅ 管理ページ表示');

    // 新商品追加テスト
    await adminPage.fill('input[placeholder="商品名"]', 'テスト商品');
    await adminPage.fill('input[type="number"]', '500');
    await adminPage.selectOption('select', 'BASE_ITEM');
    await adminPage.click('button:has-text("追加")');

    // 追加された商品の確認
    await adminPage.waitForSelector('text=テスト商品');
    console.log('✅ 新商品追加確認');

    console.log('🎊 全体フローテスト完了！');

    // テスト結果サマリー
    console.log('\n📊 テスト結果サマリー:');
    console.log('✅ ホームページ表示・商品選択');
    console.log('✅ カート機能・合計計算');
    console.log('✅ 注文作成・支払い処理');
    console.log('✅ 注文状況ページ表示');
    console.log('✅ キッチンディスプレイ機能');
    console.log('✅ リアルタイム状況更新');
    console.log('✅ 完成通知システム');
    console.log('✅ 管理ページ機能');
    console.log('\n🏆 スマホ完結型注文システム 全機能正常動作確認！');
  } catch (error) {
    console.error('❌ テスト失敗:', error);

    // スクリーンショット保存
    await page.screenshot({ path: 'error-screenshot.png' });
    console.log('📸 エラースクリーンショット保存: error-screenshot.png');
  } finally {
    await browser.close();
  }
}

// テスト実行
runE2ETest().catch(console.error);
