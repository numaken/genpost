// プロンプト量産スクリプト
// 品質を保ちつつ、業界×目的の組み合わせで生成

const industries = [
  { id: 'real-estate', name: '不動産', icon: '🏠' },
  { id: 'restaurant', name: '飲食店', icon: '🍽️' },
  { id: 'beauty-salon', name: '美容院', icon: '💇' },
  { id: 'dental', name: '歯科医院', icon: '🦷' },
  { id: 'fitness', name: 'フィットネス', icon: '💪' },
  { id: 'education', name: '塾・教育', icon: '📚' },
  { id: 'retail', name: '小売店', icon: '🛍️' },
  { id: 'consulting', name: 'コンサルティング', icon: '💼' },
  { id: 'healthcare', name: 'クリニック', icon: '🏥' },
  { id: 'legal', name: '法律事務所', icon: '⚖️' },
  { id: 'sns-marketing', name: 'SNSマーケティング', icon: '📱' },
  { id: 'influencer', name: 'インフルエンサー', icon: '✨' },
  { id: 'affiliate', name: 'アフィリエイト', icon: '💰' },
  { id: 'blog-media', name: 'ブログ・メディア', icon: '📝' },
  { id: 'ecommerce', name: 'ECサイト', icon: '🛒' },
  { id: 'tech-saas', name: 'IT・SaaS', icon: '💻' },
  { id: 'online-school', name: 'オンラインスクール', icon: '🎓' },
  { id: 'youtuber', name: 'YouTuber・配信者', icon: '📹' }
]

const purposes = [
  {
    id: 'customer-acquisition',
    name: '新規顧客獲得',
    description: '見込み客の関心を引き、来店・問い合わせを促進'
  },
  {
    id: 'repeat-customer',
    name: 'リピーター獲得',
    description: '既存顧客の再来店・継続利用を促進'
  },
  {
    id: 'trust-building',
    name: '信頼関係構築',
    description: '専門性をアピールし、顧客との信頼関係を構築'
  },
  {
    id: 'educational-content',
    name: '教育・啓発',
    description: '業界知識を提供し、顧客の理解を深める'
  },
  {
    id: 'seasonal-promotion',
    name: '季節・イベント活用',
    description: '季節性やイベントを活用した集客記事'
  }
]

const formats = [
  { id: 'how-to', name: 'ハウツー記事', description: '具体的な方法・手順を説明' },
  { id: 'case-study', name: '事例紹介', description: '成功事例や実績を紹介' },
  { id: 'comparison', name: '比較・選び方', description: '選択肢を比較し選び方を解説' },
  { id: 'interview', name: 'インタビュー形式', description: '専門家の声や顧客の声を紹介' },
  { id: 'qa-format', name: 'Q&A形式', description: 'よくある質問と回答' }
]

// プロンプトテンプレート生成
function generatePrompt(industry, purpose, format) {
  const prompt = {
    prompt_id: `${industry.id}-${purpose.id}-${format.id}`,
    industry: industry.id,
    purpose: purpose.id,
    format: format.id,
    name: `${industry.name}向け${purpose.name}（${format.name}）`,
    description: `${industry.name}の${purpose.description}を目的とした${format.description}記事を生成します。`,
    price: 980,
    is_free: false,
    system_prompt: generateSystemPrompt(industry, purpose, format),
    user_prompt_template: generateUserTemplate(industry, purpose, format),
    gen_config: {
      temperature: 0.7,
      max_tokens: 1800,
      model: 'gpt-3.5-turbo'
    },
    is_active: true
  }
  
  return prompt
}

function generateSystemPrompt(industry, purpose, format) {
  return `あなたは${industry.name}業界の専門ライターです。${purpose.description}を目的とした${format.description}記事を作成してください。

【記事の要件】
- ターゲット：${industry.name}のサービスに関心のある見込み客
- 目的：${purpose.description}
- 形式：${format.description}
- 文体：親しみやすく、読者との距離感を大切にした文章
- 構成：導入→本文→まとめの明確な構造
- 専門性：${industry.name}業界の知識と信頼性を示す内容

【注意事項】
- 読者の立場に寄り添った内容にする
- 具体的で実践的な情報を含める
- 自然な形でサービス利用を促す
- 業界の専門用語は分かりやすく説明する
- メタ的な表現（「〜についてお話しします」等）は使わない`
}

function generateUserTemplate(industry, purpose, format) {
  const templates = {
    'how-to': `以下の設定で${format.name}を作成してください：

【サービス・商品】{service}
【ターゲット客層】{target_audience}
【解決したい課題】{challenge}
【アピールポイント】{unique_value}

読者が実際に行動を起こしたくなる、実践的で魅力的な記事を作成してください。`,

    'case-study': `以下の設定で${format.name}を作成してください：

【サービス・商品】{service}
【事例の種類】{case_type}
【成功のポイント】{success_factor}
【お客様の変化】{customer_transformation}

具体的で説得力のある事例紹介記事を作成してください。`,

    'comparison': `以下の設定で${format.name}を作成してください：

【サービス・商品】{service}
【比較対象】{comparison_targets}
【選び方のポイント】{selection_criteria}
【推奨理由】{recommendation_reason}

読者が自信を持って選択できる比較・選び方ガイドを作成してください。`,

    'interview': `以下の設定で${format.name}を作成してください：

【インタビュー対象】{interview_subject}
【テーマ】{interview_theme}
【質問のポイント】{key_questions}
【読者へのメッセージ】{reader_message}

読者にとって価値のあるインサイトを提供するインタビュー記事を作成してください。`,

    'qa-format': `以下の設定で${format.name}を作成してください：

【サービス・商品】{service}
【よくある質問テーマ】{qa_theme}
【重要なポイント】{important_points}
【安心してもらいたい点】{reassurance_points}

読者の不安や疑問を解消し、安心してサービス利用できるQ&A記事を作成してください。`
  }

  return templates[format.id] || templates['how-to']
}

// 全組み合わせ生成
function generateAllPrompts() {
  const prompts = []
  
  industries.forEach(industry => {
    purposes.forEach(purpose => {
      formats.forEach(format => {
        const prompt = generatePrompt(industry, purpose, format)
        prompts.push(prompt)
      })
    })
  })
  
  return prompts
}

// SQL INSERT文生成
function generateInsertSQL(prompts) {
  const values = prompts.map(prompt => {
    const escapedSystemPrompt = prompt.system_prompt.replace(/'/g, "''")
    const escapedUserTemplate = prompt.user_prompt_template.replace(/'/g, "''")
    const escapedDescription = prompt.description.replace(/'/g, "''")
    
    return `('${prompt.prompt_id}', '${prompt.industry}', '${prompt.purpose}', '${prompt.format}', '${prompt.name}', '${escapedDescription}', ${prompt.price}, ${prompt.is_free}, '${escapedSystemPrompt}', '${escapedUserTemplate}', '${JSON.stringify(prompt.gen_config)}', ${prompt.is_active})`
  })
  
  return `INSERT INTO prompts (prompt_id, industry, purpose, format, name, description, price, is_free, system_prompt, user_prompt_template, gen_config, is_active) VALUES 
${values.join(',\n')};`
}

// 実行
const allPrompts = generateAllPrompts()

// SQLのみ出力（コメント等は除く）
console.log(generateInsertSQL(allPrompts))