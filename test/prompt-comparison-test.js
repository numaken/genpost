// プロンプト改良版と従来版の比較テスト
// Node.js環境で実行可能

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 従来版プロンプト（現在のシステムで使用中）
const originalPrompt = {
  system: `あなたは不動産業界の専門ライターです。見込み客の関心を引き、来店・問い合わせを促進を目的とした具体的な方法・手順を説明記事を作成してください。

【記事の要件】
- ターゲット：不動産サービスに関心のある見込み客
- 目的：見込み客の関心を引き、来店・問い合わせを促進
- 形式：具体的な方法・手順を説明
- 文体：親しみやすく、読者との距離感を大切にした文章
- 構成：導入→本文→まとめの明確な構造

【注意事項】
- 読者の立場に寄り添った内容にする
- 具体的で実践的な情報を含める
- 自然な形でサービス利用を促す
- メタ的な表現（「〜についてお話しします」等）は使わない`,
  user: `以下の設定でハウツー記事を作成してください：

【サービス・商品】東京都渋谷区の不動産仲介サービス
【ターゲット客層】初回マイホーム購入を検討する30代夫婦
【解決したい課題】物件選びで失敗したくない、適正価格がわからない
【アピールポイント】地域密着20年の実績、無料相談・査定サービス

読者が実際に行動を起こしたくなる、実践的で魅力的な記事を作成してください。`,
  params: {
    model: "gpt-3.5-turbo",
    temperature: 0.7,
    max_tokens: 1500
  }
};

// 改良版プロンプト（新設計）
const enhancedPrompt = {
  system: `あなたは不動産業界で15年の実務経験を持つ専門ライター兼宅地建物取引士です。

# 執筆方針
- 専門知識: 建築基準法、宅建業法、地域相場動向に精通
- 読者目線: 初心者にも分かりやすく、具体的で実践的
- 信頼構築: データや事例を用いた説得力のある内容
- 行動促進: 自然な流れでサービス利用を促す

# 出力形式
【タイトル】SEO最適化された魅力的な見出し
【記事内容】
## 導入（問題提起・共感）
## 本文（3-4つのポイントで構成）
## 結論（まとめ・次のアクション）

# 品質基準
- 読みやすさ: 1文40文字以内、段落は3-4行以内
- 信頼性: 具体的な数値・事例を最低2つ含める  
- 実用性: 読者が即実践できる具体的手順を提示
- SEO: 自然なキーワード配置（詰め込み禁止）

メタ表現は厳禁。読者に直接語りかける文体で執筆してください。`,
  user: `【記事作成設定】
対象サービス: 東京都渋谷区の不動産仲介サービス
ターゲット: 初回マイホーム購入を検討する30代夫婦
解決課題: 物件選びで失敗したくない、適正価格がわからない
強み・特徴: 地域密着20年の実績、無料相談・査定サービス
地域情報: 渋谷区（アクセス良好、資産価値安定エリア）

上記設定で、読者が「このサービスを利用したい」と思える説得力のある記事を作成してください。`,
  params: {
    model: "gpt-3.5-turbo",
    temperature: 0.5,
    max_tokens: 2200,
    top_p: 0.9,
    presence_penalty: 0.15,
    frequency_penalty: 0.15
  }
};

// 記事生成テスト関数
async function generateArticle(prompt, label) {
  try {
    console.log(`\n=== ${label} 記事生成開始 ===`);
    
    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user }
      ],
      ...prompt.params
    });

    const article = completion.choices[0].message.content;
    
    console.log(`\n【${label} 結果】`);
    console.log('-'.repeat(80));
    console.log(article);
    console.log('-'.repeat(80));
    
    // 品質評価指標
    const metrics = analyzeArticle(article);
    console.log(`\n【${label} 品質評価】`);
    console.log(`文字数: ${metrics.charCount}`);
    console.log(`段落数: ${metrics.paragraphCount}`);
    console.log(`平均文長: ${metrics.avgSentenceLength}文字`);
    console.log(`数値データ含有: ${metrics.hasNumbers ? 'あり' : 'なし'}`);
    console.log(`具体例の数: ${metrics.exampleCount}`);
    console.log(`メタ表現: ${metrics.hasMetaExpressions ? 'あり（要改善）' : 'なし（良好）'}`);
    
    return { article, metrics };
    
  } catch (error) {
    console.error(`${label}でエラー:`, error.message);
    return null;
  }
}

// 記事品質分析関数
function analyzeArticle(article) {
  const sentences = article.split(/[。！？]/).filter(s => s.trim().length > 0);
  const paragraphs = article.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  return {
    charCount: article.length,
    paragraphCount: paragraphs.length,
    avgSentenceLength: Math.round(sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length),
    hasNumbers: /\d+/.test(article),
    exampleCount: (article.match(/例えば|たとえば|実際に|具体的には/g) || []).length,
    hasMetaExpressions: /(について.*お話し|について.*説明し|について.*ご紹介)/.test(article)
  };
}

// 比較テスト実行
async function runComparisonTest() {
  console.log('プロンプト改良版 vs 従来版 比較テスト開始');
  
  const originalResult = await generateArticle(originalPrompt, '従来版');
  const enhancedResult = await generateArticle(enhancedPrompt, '改良版');
  
  if (originalResult && enhancedResult) {
    console.log('\n=== 総合比較 ===');
    console.log('項目\t\t従来版\t改良版\t改善');
    console.log(`文字数\t\t${originalResult.metrics.charCount}\t${enhancedResult.metrics.charCount}\t${enhancedResult.metrics.charCount > originalResult.metrics.charCount ? '◯' : '△'}`);
    console.log(`平均文長\t${originalResult.metrics.avgSentenceLength}\t${enhancedResult.metrics.avgSentenceLength}\t${enhancedResult.metrics.avgSentenceLength < originalResult.metrics.avgSentenceLength ? '◯' : '△'}`);
    console.log(`数値データ\t${originalResult.metrics.hasNumbers ? 'あり' : 'なし'}\t${enhancedResult.metrics.hasNumbers ? 'あり' : 'なし'}\t${enhancedResult.metrics.hasNumbers ? '◯' : '△'}`);
    console.log(`具体例数\t${originalResult.metrics.exampleCount}\t${enhancedResult.metrics.exampleCount}\t${enhancedResult.metrics.exampleCount > originalResult.metrics.exampleCount ? '◯' : '△'}`);
    console.log(`メタ表現\t${originalResult.metrics.hasMetaExpressions ? 'あり' : 'なし'}\t${enhancedResult.metrics.hasMetaExpressions ? 'あり' : 'なし'}\t${!enhancedResult.metrics.hasMetaExpressions ? '◯' : '△'}`);
  }
}

// 実行（Node.js環境で）
// runComparisonTest();

export { runComparisonTest, generateArticle, analyzeArticle };