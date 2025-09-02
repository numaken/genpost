import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface PromptVersion {
  id: string
  prompt_id: string
  version: string
  version_name: string
  system_prompt: string
  user_prompt_template: string
  gen_config: any
  quality_settings: any
  is_active: boolean
  is_default: boolean
}

export interface ABTestConfig {
  id: string
  prompt_id: string
  test_name: string
  version_a: string
  version_b: string
  traffic_split: number
  is_active: boolean
  target_sample_size: number
}

export interface ABTestResult {
  user_id: string
  prompt_id: string
  version_used: string
  article_generated: string
  generation_time_ms: number
  quality_score: number
  metrics: any
}

// プロンプトバージョンを取得（A/Bテスト考慮）
export async function getPromptVersion(
  promptId: string, 
  userId: string
): Promise<PromptVersion | null> {
  try {
    // A/Bテスト設定をチェック
    const { data: abConfig } = await supabase
      .from('prompt_ab_test_config')
      .select('*')
      .eq('prompt_id', promptId)
      .eq('is_active', true)
      .single()

    let targetVersion = 'v1.0' // デフォルトは従来版

    if (abConfig) {
      // A/Bテストが有効な場合、トラフィック分割に基づいてバージョンを決定
      const userHash = hashUserId(userId)
      const shouldUseVersionB = userHash < abConfig.traffic_split
      
      targetVersion = shouldUseVersionB ? abConfig.version_b : abConfig.version_a
      
      console.log(`A/Bテスト実行: ${promptId}, ユーザー: ${userId}, バージョン: ${targetVersion}`)
    }

    // 指定バージョンのプロンプトを取得
    if (targetVersion === 'v1.0') {
      // 従来版は既存のpromptsテーブルから取得
      const { data: originalPrompt } = await supabase
        .from('prompts')
        .select('*')
        .eq('prompt_id', promptId)
        .single()
      
      if (originalPrompt) {
        return {
          id: originalPrompt.id,
          prompt_id: originalPrompt.prompt_id,
          version: 'v1.0',
          version_name: '従来版',
          system_prompt: originalPrompt.system_prompt,
          user_prompt_template: originalPrompt.user_prompt_template,
          gen_config: originalPrompt.gen_config,
          quality_settings: {},
          is_active: originalPrompt.is_active,
          is_default: true
        }
      }
    } else {
      // 改良版はprompt_versionsテーブルから取得
      const { data: versionPrompt } = await supabase
        .from('prompt_versions')
        .select('*')
        .eq('prompt_id', promptId)
        .eq('version', targetVersion)
        .eq('is_active', true)
        .single()
      
      if (versionPrompt) {
        return versionPrompt
      }
    }

    return null
  } catch (error) {
    console.error('プロンプトバージョン取得エラー:', error)
    return null
  }
}

// ユーザーIDのハッシュ化（一貫したA/B振り分けのため）
function hashUserId(userId: string): number {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 32bit整数に変換
  }
  // 0-1の範囲に正規化
  return Math.abs(hash) / 2147483647
}

// A/Bテスト結果を記録
export async function recordABTestResult(result: ABTestResult) {
  try {
    const { error } = await supabase
      .from('prompt_ab_test_results')
      .insert([result])
    
    if (error) throw error
    
    console.log('A/Bテスト結果記録完了:', {
      prompt_id: result.prompt_id,
      version: result.version_used,
      quality_score: result.quality_score
    })
  } catch (error) {
    console.error('A/Bテスト結果記録エラー:', error)
  }
}

// 記事品質スコアを計算
export async function calculateQualityScore(
  articleText: string,
  qualitySettings: any
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('calculate_article_quality_score', {
      article_text: articleText,
      target_settings: qualitySettings
    })
    
    if (error) throw error
    return data || 0
  } catch (error) {
    console.error('品質スコア計算エラー:', error)
    return 0
  }
}

// A/Bテスト統計を取得
export async function getABTestStats(promptId: string) {
  try {
    const { data } = await supabase
      .from('prompt_ab_test_results')
      .select('version_used, quality_score, generation_time_ms, created_at')
      .eq('prompt_id', promptId)
      .order('created_at', { ascending: false })
    
    if (!data) return null

    // バージョン別統計を計算
    const stats = data.reduce((acc: any, result: any) => {
      const version = result.version_used
      if (!acc[version]) {
        acc[version] = {
          count: 0,
          totalQuality: 0,
          totalTime: 0,
          avgQuality: 0,
          avgTime: 0
        }
      }
      
      acc[version].count++
      acc[version].totalQuality += result.quality_score || 0
      acc[version].totalTime += result.generation_time_ms || 0
      acc[version].avgQuality = acc[version].totalQuality / acc[version].count
      acc[version].avgTime = acc[version].totalTime / acc[version].count
      
      return acc
    }, {})
    
    return stats
  } catch (error) {
    console.error('A/Bテスト統計取得エラー:', error)
    return null
  }
}

// A/Bテストを開始
export async function startABTest(promptId: string) {
  try {
    const { error } = await supabase
      .from('prompt_ab_test_config')
      .update({ is_active: true })
      .eq('prompt_id', promptId)
    
    if (error) throw error
    
    console.log(`A/Bテスト開始: ${promptId}`)
  } catch (error) {
    console.error('A/Bテスト開始エラー:', error)
  }
}

// A/Bテストを停止
export async function stopABTest(promptId: string) {
  try {
    const { error } = await supabase
      .from('prompt_ab_test_config')
      .update({ is_active: false })
      .eq('prompt_id', promptId)
    
    if (error) throw error
    
    console.log(`A/Bテスト停止: ${promptId}`)
  } catch (error) {
    console.error('A/Bテスト停止エラー:', error)
  }
}