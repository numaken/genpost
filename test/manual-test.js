// 手動テスト用の簡単な実行スクリプト
// OpenAI APIキーを設定して実行

const { runComparisonTest } = require('./prompt-comparison-test.js');

// 環境変数チェック
if (!process.env.OPENAI_API_KEY) {
  console.log('OPENAI_API_KEYが設定されていません。');
  console.log('実行方法: OPENAI_API_KEY=your_key node test/manual-test.js');
  process.exit(1);
}

// テスト実行
runComparisonTest().catch(console.error);