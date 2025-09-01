const fs = require('fs');
const path = require('path');

// catalog.htmlを読み込み
const catalogPath = path.join(__dirname, '../app/prompts/catalog.html');
const catalogHtml = fs.readFileSync(catalogPath, 'utf-8');

// 業界別プロンプト抽出
const industries = [
  { key: 'real-estate', name: '不動産業界', icon: '🏠', packPrice: 19800 },
  { key: 'tech-saas', name: 'IT・SaaS業界', icon: '💻', packPrice: 24800 },
  { key: 'ecommerce', name: 'EC・物販業界', icon: '🛒', packPrice: 22800 },
  { key: 'beauty-health', name: '美容・健康業界', icon: '💄', packPrice: 21800 },
  { key: 'education', name: '教育業界', icon: '📚', packPrice: 20800 },
  { key: 'restaurant', name: '飲食業界', icon: '🍽️', packPrice: 18800 },
  { key: 'finance', name: '金融業界', icon: '💰', packPrice: 25800 },
  { key: 'entertainment', name: 'エンタメ業界', icon: '🎮', packPrice: 23800 }
];

const formats = [
  'ガイド', 'リスト', 'ハウツー', 'ケーススタディ', 'バズ狙い', '分析'
];

const purposes = [
  'リード獲得', '顧客獲得', '認知拡大', 'エンゲージメント向上', 'セールス促進', 'ブランディング'
];

// プロンプトデータ生成
let prompts = [];
let promptIdCounter = 1;

industries.forEach((industry, industryIndex) => {
  formats.forEach((format, formatIndex) => {
    purposes.forEach((purpose, purposeIndex) => {
      // 各組み合わせでプロンプトを生成（10個ずつ）
      for (let i = 1; i <= 10; i++) {
        const promptId = `${industry.key}-${format.toLowerCase().replace(/[・]/g, '-')}-${purpose.replace(/[・]/g, '-')}-${i}`;
        
        const prompt = {
          prompt_id: promptId,
          industry: industry.key,
          purpose: purpose,
          format: format,
          name: `${industry.name}向け${format}記事：${purpose}${i}`,
          description: `${industry.name}の${purpose}を目的とした${format}記事を生成します。専門知識と実践的なアドバイスを組み合わせた高品質なコンテンツを提供。`,
          price: Math.floor(Math.random() * 3000) + 1000, // 1000-4000円のランダム価格
          is_free: Math.random() < 0.1, // 10%の確率で無料
          system_prompt: `あなたは${industry.name}の専門家です。${purpose}を目的とした${format}記事を作成してください。

専門知識を活かし、読者にとって実用的で価値ある情報を提供してください。
記事は以下の構造で出力してください：

【タイトル】
魅力的で具体的なタイトル

【記事】
詳細で実践的な内容
- 具体例やデータを含める
- 読者の課題解決に焦点を当てる
- 業界特有の専門用語を適切に使用`,

          user_prompt_template: generateUserPromptTemplate(industry.key, format, purpose),
          gen_config: {
            engine: {
              temperature: 0.7,
              max_tokens: 2000
            }
          },
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        prompts.push(prompt);
      }
    });
  });
});

// ユーザープロンプトテンプレート生成
function generateUserPromptTemplate(industry, format, purpose) {
  const templates = {
    'real-estate': '{location}の{service}について、{target_audience}向けに{challenge}を解決する{format}記事を書いてください。{unique_value}を強調してください。',
    'tech-saas': '{service_name}の{features}について、{target_audience}向けに{challenge}を解決する{format}記事を書いてください。{benefits}を具体的に説明してください。',
    'ecommerce': '{product_name}について、{target_audience}向けに{challenge}を解決する{format}記事を書いてください。{unique_value}と{price}の価値を伝えてください。',
    'beauty-health': '{service_name}について、{target_audience}向けに{challenge}を解決する{format}記事を書いてください。{benefits}と{success_factor}を詳しく説明してください。',
    'education': '{service_name}について、{target_audience}向けに{challenge}を解決する{format}記事を書いてください。{learning_outcome}と{method}を具体的に説明してください。',
    'restaurant': '{restaurant_name}の{specialty}について、{target_audience}向けに{challenge}を解決する{format}記事を書いてください。{location}と{unique_value}を強調してください。',
    'finance': '{service_name}について、{target_audience}向けに{challenge}を解決する{format}記事を書いてください。{benefits}と{risk_management}を説明してください。',
    'entertainment': '{content_name}について、{target_audience}向けに{challenge}を解決する{format}記事を書いてください。{unique_value}と{engagement_factor}を強調してください。'
  };
  
  return templates[industry] || templates['real-estate'];
}

// SQLファイル生成
function generateSQL() {
  let sql = `-- Catalog prompts migration
-- Generated: ${new Date().toISOString()}

-- Insert prompts
`;

  prompts.forEach(prompt => {
    sql += `INSERT INTO prompts (
  prompt_id, industry, purpose, format, name, description, price, is_free,
  system_prompt, user_prompt_template, gen_config, is_active, created_at, updated_at
) VALUES (
  '${prompt.prompt_id}',
  '${prompt.industry}',
  '${prompt.purpose}',
  '${prompt.format}',
  '${prompt.name.replace(/'/g, "''")}',
  '${prompt.description.replace(/'/g, "''")}',
  ${prompt.price},
  ${prompt.is_free},
  '${prompt.system_prompt.replace(/'/g, "''")}',
  '${prompt.user_prompt_template.replace(/'/g, "''")}',
  '${JSON.stringify(prompt.gen_config).replace(/'/g, "''")}',
  ${prompt.is_active},
  '${prompt.created_at}',
  '${prompt.updated_at}'
);

`;
  });

  // 業界パック情報も追加
  sql += `-- Insert industry packs
`;

  industries.forEach(industry => {
    sql += `INSERT INTO industry_packs (
  pack_id, industry, name, description, price, icon, is_active, created_at, updated_at
) VALUES (
  '${industry.key}-pack',
  '${industry.key}',
  '${industry.name}パック',
  '${industry.name}の全プロンプト（${formats.length * purposes.length * 10}個）がセットになったお得なパック',
  ${industry.packPrice},
  '${industry.icon}',
  true,
  '${new Date().toISOString()}',
  '${new Date().toISOString()}'
);

`;
  });

  return sql;
}

// JSON形式でも出力
const outputDir = path.join(__dirname, '../migration');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// SQLファイル出力
fs.writeFileSync(
  path.join(outputDir, 'catalog-prompts.sql'),
  generateSQL(),
  'utf-8'
);

// JSONファイル出力（デバッグ用）
fs.writeFileSync(
  path.join(outputDir, 'catalog-prompts.json'),
  JSON.stringify({ industries, prompts }, null, 2),
  'utf-8'
);

console.log(`✅ Generated ${prompts.length} prompts for ${industries.length} industries`);
console.log(`📄 Files created:`);
console.log(`   - migration/catalog-prompts.sql`);
console.log(`   - migration/catalog-prompts.json`);
console.log(`🎯 Total combinations: ${industries.length} industries × ${formats.length} formats × ${purposes.length} purposes × 10 variations = ${prompts.length} prompts`);