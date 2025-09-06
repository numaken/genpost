// scripts/migratePromptsToPacksScript.ts - 旧プロンプトDBからPack移行スクリプト

import { createClient } from '@supabase/supabase-js'
import { migratePromptToPack } from '../lib/packSystem'
import { VerticalKey } from '../lib/headingMapByVertical'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * 旧プロンプトの構造（想定）
 */
interface LegacyPrompt {
  id: string
  title: string
  content: string
  category: string // 'restaurant', 'beauty', 'healthcare', etc.
  subcategory: string
  price: number
  downloads: number
  rating: number
  created_at: string
}

/**
 * プロンプト内容からPack要素を抽出
 */
function extractPackAssets(promptContent: string, category: string) {
  // voice（システムプロンプトの口調部分を抽出）
  const voiceMatch = promptContent.match(/(?:あなたは|として|口調|トーン|文体)(.*?)(?=\n\n|\n#|。)/s)
  const voice = voiceMatch ? voiceMatch[0] : 
    "読者に親しみやすく、実用的な情報を提供するライターとして記事を作成してください。"

  // heading（見出し指示を抽出してマップ化）
  const headingInstructions = extractHeadingInstructions(promptContent)
  
  // humanize（禁止表現・置換指示を抽出）
  const humanizeRules = extractHumanizeRules(promptContent)
  
  // flow（生成フロー指示を抽出）
  const flowInstructions = extractFlowInstructions(promptContent)

  return {
    voice: {
      system: voice,
      temperature: getTemperatureForCategory(category),
      maxTokens: 4000
    },
    heading: {
      map: headingInstructions
    },
    humanize: {
      rules: humanizeRules,
      useLLM: true
    },
    flow: {
      critiqueRubric: flowInstructions.critiqueRubric,
      skipThreshold: 2
    },
    meta: {
      schemaOrg: true,
      seoBoost: category !== 'general'
    }
  }
}

/**
 * プロンプトから見出し指示を抽出
 */
function extractHeadingInstructions(content: string): Record<string, string> {
  const headingMap: Record<string, string> = {}
  
  // 「〜の見出しは"〜"にしてください」パターンを検出
  const patterns = [
    /(?:問題|課題).*?見出し.*?["「](.+?)["」]/g,
    /(?:解決策|提案).*?見出し.*?["「](.+?)["」]/g,
    /(?:根拠|証拠).*?見出し.*?["「](.+?)["」]/g,
    /(?:まとめ|結論).*?見出し.*?["「](.+?)["」]/g,
  ]
  
  const headingTypes = ['問題・課題', '解決策と提案', '根拠と証拠', 'まとめ']
  
  patterns.forEach((pattern, index) => {
    const matches = [...content.matchAll(pattern)]
    if (matches.length > 0) {
      headingMap[headingTypes[index]] = matches[0][1]
    }
  })
  
  return headingMap
}

/**
 * プロンプトから人肌化ルールを抽出
 */
function extractHumanizeRules(content: string): [string, string][] {
  const rules: [string, string][] = []
  
  // 「〜は〜に変更」「〜ではなく〜」パターンを検出
  const patterns = [
    /["「]([^"」]+)["」].*?(?:は|を).*?["「]([^"」]+)["」].*?(?:変更|置換|変える)/g,
    /["「]([^"」]+)["」].*?ではなく.*?["「]([^"」]+)["」]/g,
    /([^。]+).*?禁止.*?代わりに.*?([^。]+)/g
  ]
  
  patterns.forEach(pattern => {
    const matches = [...content.matchAll(pattern)]
    matches.forEach(match => {
      if (match[1] && match[2]) {
        rules.push([match[1].trim(), match[2].trim()])
      }
    })
  })
  
  return rules
}

/**
 * プロンプトからフロー指示を抽出
 */
function extractFlowInstructions(content: string) {
  // 「チェック」「確認」「見直し」などのキーワードから批評ルーブリックを生成
  const critiquePatterns = [
    /(?:チェック|確認|見直し|注意).*?([^。]+)/g,
    /(?:避ける|禁止|NG).*?([^。]+)/g
  ]
  
  const critiques: string[] = []
  critiquePatterns.forEach(pattern => {
    const matches = [...content.matchAll(pattern)]
    matches.forEach(match => {
      critiques.push(match[1].trim())
    })
  })
  
  const critiqueRubric = critiques.length > 0 
    ? `以下の観点で指摘: ${critiques.join(', ')}`
    : '紋切り句、冗長表現、曖昧さをチェック'
    
  return { critiqueRubric }
}

/**
 * カテゴリに応じた適切なtemperatureを返す
 */
function getTemperatureForCategory(category: string): number {
  const temperatureMap: Record<string, number> = {
    'restaurant': 0.6, // 親しみやすさ重視
    'beauty': 0.5,     // 専門性と安心感
    'healthcare': 0.3, // 正確性重視
    'finance': 0.3,    // 正確性重視
    'tech': 0.4,       // 論理性重視
    'general': 0.5     // デフォルト
  }
  
  return temperatureMap[category] || 0.5
}

/**
 * カテゴリをVerticalKeyにマッピング
 */
function mapCategoryToVertical(category: string): VerticalKey {
  const mapping: Record<string, VerticalKey> = {
    'restaurant': 'restaurant',
    'cafe': 'restaurant',
    'beauty': 'beauty',
    'healthcare': 'healthcare',
    'medical': 'healthcare', 
    'realestate': 'realestate',
    'finance': 'finance',
    'tech': 'tech',
    'it': 'tech',
    'retail': 'retail',
    'service': 'service',
    'education': 'education',
    'tourism': 'tourism',
    'manufacturing': 'manufacturing'
  }
  
  return mapping[category.toLowerCase()] || 'common'
}

/**
 * 価格を調整（Pack化に伴う価格設定）
 */
function adjustPriceForPack(originalPrice: number, category: string): number {
  // Pack化により機能が拡張されるため、価格を調整
  const multiplier = category === 'general' ? 1.2 : 1.5
  const adjustedPrice = Math.round(originalPrice * multiplier)
  
  // 価格帯を整理
  if (adjustedPrice < 1000) return 980
  if (adjustedPrice < 3000) return 2980
  if (adjustedPrice < 5000) return 4980
  if (adjustedPrice < 8000) return 6980
  return 9980
}

/**
 * メイン移行関数
 */
export async function migrateLegacyPromptsToPacks() {
  console.log('🔄 プロンプトDBからPack移行を開始...')
  
  // 1. 既存のプロンプト一覧を取得（仮想的なテーブル名）
  const { data: legacyPrompts, error } = await supabase
    .from('legacy_prompts') // 実際のテーブル名に変更
    .select('*')
    .eq('is_active', true)
    .order('downloads', { ascending: false }) // 人気順
  
  if (error) {
    console.error('❌ 既存プロンプト取得エラー:', error)
    return
  }
  
  console.log(`📊 ${legacyPrompts?.length || 0}件のプロンプトを移行対象として検出`)
  
  if (!legacyPrompts || legacyPrompts.length === 0) {
    console.log('✅ 移行対象なし')
    return
  }
  
  // 2. 各プロンプトをPackに変換
  let successCount = 0
  let errorCount = 0
  
  for (const prompt of legacyPrompts as LegacyPrompt[]) {
    try {
      console.log(`🔄 移行中: ${prompt.title} (ID: ${prompt.id})`)
      
      const vertical = mapCategoryToVertical(prompt.category)
      const assets = extractPackAssets(prompt.content, prompt.category)
      const adjustedPrice = adjustPriceForPack(prompt.price, prompt.category)
      
      const packId = await migratePromptToPack(prompt.id, {
        name: `${prompt.title} v2.0`, // Pack版として明示
        description: `${prompt.title}をpanolabo AI v2.1対応にアップグレード。二段生成・業種別見出し・人肌フィルタを統合。`,
        price: adjustedPrice,
        vertical,
        assets
      })
      
      console.log(`✅ 移行完了: ${prompt.title} → Pack ID: ${packId}`)
      successCount++
      
      // 少し待機（API制限対策）
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.error(`❌ 移行エラー: ${prompt.title}`, error)
      errorCount++
    }
  }
  
  console.log('🎉 移行完了！')
  console.log(`✅ 成功: ${successCount}件`)
  console.log(`❌ 失敗: ${errorCount}件`)
  
  // 3. 移行後の統計表示
  const { data: newPacks } = await supabase
    .from('packs')
    .select('count(*)')
    .eq('is_active', true)
  
  console.log(`📊 総Pack数: ${newPacks?.[0]?.count || '不明'}`)
}

/**
 * バッチ実行用のヘルパー（カテゴリ別移行）
 */
export async function migrateByCategory(category: string) {
  console.log(`🔄 カテゴリ別移行開始: ${category}`)
  
  const { data: prompts } = await supabase
    .from('legacy_prompts')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
  
  if (!prompts) {
    console.log(`❌ カテゴリ ${category} にプロンプトが見つかりません`)
    return
  }
  
  console.log(`📊 ${prompts.length}件のプロンプトを移行`)
  // 以下は上記のメイン移行ロジックと同様
}

// CLI実行用
if (require.main === module) {
  migrateLegacyPromptsToPacks()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('移行スクリプトエラー:', error)
      process.exit(1)
    })
}