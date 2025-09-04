import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// .env.local から環境変数を手動で読み込み
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8')
  const envVars = envFile.split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => line.split('='))
    .reduce((acc, [key, ...values]) => {
      acc[key.trim()] = values.join('=').trim()
      return acc
    }, {})
  
  Object.assign(process.env, envVars)
}

console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing')
console.log('SERVICE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing')

// Supabase接続
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 共通のsystem_prompt（業界特化型高品質記事生成）
const SYSTEM_PROMPT = `あなたは業界特化の編集ライター。読者の行動変容を促す高品質記事を生成。
出力は純Markdownのみ。日本語。SEO最適化済み。
業界固有の専門用語と顧客心理を深く理解している。`

// 共通のuser_prompt_template
const USER_PROMPT_TEMPLATE = `# 業界
{{industry}}

# 目的
{{purpose}}

# 形式
{{format}}

# ターゲット
{{audience || '業界に興味がある見込み客'}}

# キーワード
{{keywords || '業界関連キーワード'}}

# トピック
{{topic || '業界の最新トレンド'}}

# 追加要素
{{extra || ''}}`

// 12業種カタログ
const PROMPTS_CATALOG = [
  {
    prompt_id: 'real-estate-howto',
    industry: '不動産',
    purpose: '内見予約獲得',
    format: 'ハウツー',
    name: '不動産｜内見予約獲得｜ハウツー記事',
    description: '物件選びのコツから内見のポイントまで、見込み客の不安を解消し内見予約へ導く記事を生成',
    price: 980,
    is_free: false
  },
  {
    prompt_id: 'restaurant-case-study',
    industry: '飲食店',
    purpose: '来店予約獲得',
    format: '事例紹介',
    name: '飲食店｜来店予約獲得｜事例紹介',
    description: '実際のお客様の体験談を通じて、来店意欲を高める記事を生成',
    price: 980,
    is_free: false
  },
  {
    prompt_id: 'beauty-comparison',
    industry: '美容院',
    purpose: '新規客の信頼獲得',
    format: '比較・選び方',
    name: '美容院｜新規客獲得｜比較記事',
    description: '美容院選びのポイントと自店の強みを自然に訴求する記事を生成',
    price: 980,
    is_free: false
  },
  {
    prompt_id: 'dental-qa',
    industry: '歯科医院',
    purpose: '定期検診の継続',
    format: 'Q&A形式',
    name: '歯科医院｜定期検診促進｜Q&A',
    description: '患者の疑問に答えながら定期検診の重要性を伝える記事を生成',
    price: 0,
    is_free: true  // 無料サンプル
  },
  {
    prompt_id: 'fitness-interview',
    industry: 'フィットネス',
    purpose: '体験申込',
    format: 'インタビュー',
    name: 'フィットネス｜体験申込｜インタビュー',
    description: 'トレーナーや会員の声を通じて体験申込を促す記事を生成',
    price: 980,
    is_free: false
  },
  {
    prompt_id: 'education-howto',
    industry: '塾・教育',
    purpose: '体験授業申込',
    format: 'ハウツー',
    name: '塾・教育｜体験授業｜学習法解説',
    description: '効果的な学習法を紹介しながら体験授業へ誘導する記事を生成',
    price: 980,
    is_free: false
  },
  {
    prompt_id: 'retail-comparison',
    industry: '小売店',
    purpose: 'EC誘導',
    format: '比較・選び方',
    name: '小売店｜EC誘導｜商品比較',
    description: '商品の選び方を解説しながらECサイトへ誘導する記事を生成',
    price: 0,
    is_free: true  // 無料サンプル
  },
  {
    prompt_id: 'consulting-case',
    industry: 'コンサル',
    purpose: 'リード獲得',
    format: '事例紹介',
    name: 'コンサル｜リード獲得｜成功事例',
    description: 'クライアントの成功事例を通じてリード獲得する記事を生成',
    price: 1480,
    is_free: false
  },
  {
    prompt_id: 'clinic-qa',
    industry: 'クリニック',
    purpose: '初診予約',
    format: 'Q&A形式',
    name: 'クリニック｜初診予約｜症状Q&A',
    description: '症状別の対応を解説しながら初診予約へ導く記事を生成',
    price: 980,
    is_free: false
  },
  {
    prompt_id: 'law-faq',
    industry: '法律事務所',
    purpose: '相談予約',
    format: 'FAQ',
    name: '法律事務所｜相談予約｜法律FAQ',
    description: '法的な疑問に答えながら相談予約を促す記事を生成',
    price: 1480,
    is_free: false
  },
  {
    prompt_id: 'saas-howto',
    industry: 'IT・SaaS',
    purpose: 'トライアル申込',
    format: 'ハウツー',
    name: 'IT/SaaS｜トライアル｜活用ガイド',
    description: 'ツールの活用法を解説しながらトライアル申込へ導く記事を生成',
    price: 0,
    is_free: true  // 無料サンプル
  },
  {
    prompt_id: 'sns-case-study',
    industry: 'SNSマーケ',
    purpose: 'お問い合わせ',
    format: 'ケーススタディ',
    name: 'SNSマーケ｜問合せ｜成功ケース',
    description: 'SNS活用の成功事例を通じて問い合わせを獲得する記事を生成',
    price: 980,
    is_free: false
  }
]

// デフォルトの生成設定
const DEFAULT_GEN_CONFIG = {
  model: 'gpt-4o-mini',
  temperature: 0.7,
  max_tokens: 2000,
  top_p: 0.9,
  presence_penalty: 0.1,
  frequency_penalty: 0.1
}

async function seedPrompts() {
  console.log('Starting prompts seeding...')
  
  try {
    // 各プロンプトを挿入
    for (const prompt of PROMPTS_CATALOG) {
      const { data, error } = await supabase
        .from('prompts')
        .upsert({
          prompt_id: prompt.prompt_id,
          industry: prompt.industry,
          purpose: prompt.purpose,
          format: prompt.format,
          name: prompt.name,
          description: prompt.description,
          price: prompt.price,
          is_free: prompt.is_free,
          system_prompt: SYSTEM_PROMPT,
          user_prompt_template: USER_PROMPT_TEMPLATE,
          gen_config: DEFAULT_GEN_CONFIG,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'prompt_id'
        })
        .select()
      
      if (error) {
        console.error(`Error seeding ${prompt.name}:`, error)
      } else {
        console.log(`✅ Seeded: ${prompt.name}`)
      }
    }
    
    // 確認のため総数を取得
    const { data: count, error: countError } = await supabase
      .from('prompts')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
    
    if (!countError) {
      console.log(`\n✅ Total active prompts in database: ${count}`)
    }
    
    console.log('\n🎉 Seeding completed successfully!')
    console.log('Free prompts:', PROMPTS_CATALOG.filter(p => p.is_free).map(p => p.name))
    
  } catch (error) {
    console.error('Seeding failed:', error)
    process.exit(1)
  }
}

// 実行
seedPrompts()