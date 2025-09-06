// lib/banditUtils.ts - バンディット最適化用ユーティリティ（DB連携）

import { createClient } from '@supabase/supabase-js'
import { UCB1 } from './bandit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * CTA候補の例
 */
export const CTA_CANDIDATES = {
  call: [
    '今すぐお電話ください',
    'お気軽にお電話を',
    'まずはお電話で相談',
  ],
  contact: [
    'お問い合わせはこちら',
    'まずはお問い合わせを',
    '無料相談はこちら',
  ],
  trial: [
    '無料体験を申し込む',
    'まずは無料でお試し',
    '今すぐ無料体験',
  ]
}

/**
 * 見出し候補の例（業種別）
 */
export const HEADING_CANDIDATES = {
  restaurant: [
    'お客様に愛される理由',
    '選ばれ続ける秘密',
    'リピーターが絶えない理由',
  ],
  retail: [
    '売れ続ける商品の秘密',
    'お客様が選ぶ理由',
    '人気の理由とは',
  ]
}

/**
 * バンディット設定を保存
 */
export async function saveBanditConfig(
  siteId: string,
  type: 'cta' | 'heading',
  choices: string[]
): Promise<void> {
  try {
    const bandit = new UCB1(choices)
    
    const { error } = await supabase
      .from('bandit_configs') // 仮想テーブル名
      .upsert({
        site_id: siteId,
        type: type,
        config: bandit.serialize(),
        updated_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('Bandit config save error:', error)
    }
  } catch (error) {
    console.error('Bandit config save error:', error)
  }
}

/**
 * バンディット設定を読み込み
 */
export async function loadBanditConfig(
  siteId: string,
  type: 'cta' | 'heading'
): Promise<UCB1 | null> {
  try {
    const { data, error } = await supabase
      .from('bandit_configs')
      .select('config')
      .eq('site_id', siteId)
      .eq('type', type)
      .single()
    
    if (error || !data?.config) {
      return null
    }
    
    return UCB1.deserialize(data.config)
  } catch (error) {
    console.error('Bandit config load error:', error)
    return null
  }
}

/**
 * バンディットの選択と結果記録
 */
export async function pickAndRecord(
  siteId: string,
  type: 'cta' | 'heading',
  defaultChoices: string[]
): Promise<string> {
  try {
    let bandit = await loadBanditConfig(siteId, type)
    
    if (!bandit) {
      // 初回は新しいバンディットを作成
      bandit = new UCB1(defaultChoices)
      await saveBanditConfig(siteId, type, defaultChoices)
    }
    
    const choice = bandit.pick()
    
    // 選択を記録（後でフィードバックを受け取るため）
    const { error } = await supabase
      .from('bandit_selections') // 仮想テーブル名
      .insert({
        site_id: siteId,
        type: type,
        choice: choice,
        created_at: new Date().toISOString(),
        feedback_received: false
      })
    
    if (error) {
      console.error('Bandit selection save error:', error)
    }
    
    return choice
  } catch (error) {
    console.error('Bandit pick error:', error)
    return defaultChoices[0] // フォールバック
  }
}

/**
 * フィードバック記録（クリック率などの成果データ）
 */
export async function recordFeedback(
  siteId: string,
  type: 'cta' | 'heading',
  choice: string,
  reward: number // 0-1の数値（例：0.05 = 5%のクリック率）
): Promise<void> {
  try {
    // バンディット設定を更新
    const bandit = await loadBanditConfig(siteId, type)
    if (bandit) {
      bandit.feedback(choice, reward)
      await saveBanditConfig(siteId, type, bandit.choices)
    }
    
    // フィードバックを記録
    const { error } = await supabase
      .from('bandit_feedback') // 仮想テーブル名
      .insert({
        site_id: siteId,
        type: type,
        choice: choice,
        reward: reward,
        recorded_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('Feedback record error:', error)
    }
  } catch (error) {
    console.error('Feedback record error:', error)
  }
}