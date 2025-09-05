/**
 * 堅牢な使用制限チェック - 例外を決して投げない
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface UsageResult {
  ok: boolean
  reason?: string
  used?: number
  limit?: number
  plan?: string
}

/**
 * プランを安全に取得（存在しない場合はデフォルト）
 */
async function getPlanSafe(userId: string): Promise<string> {
  try {
    // ここではシンプルに固定値を返す。実際のプランテーブルがある場合は適宜修正
    return 'free'
  } catch {
    return 'free'
  }
}

/**
 * 今月の使用量を安全に取得
 */
async function getUsedSafe(userId: string): Promise<number> {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    
    // generation_audit テーブルから今月の使用量を取得
    const { data, error } = await supabase
      .from('generation_audit')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', `${currentMonth}-01`)
      .lt('created_at', `${currentMonth}-32`)

    if (error) {
      console.warn('Usage query failed:', error.message)
      return 0 // エラー時は0を返して制限を緩く
    }

    return data?.length || 0
  } catch (error) {
    console.warn('Usage check failed:', error)
    return 0
  }
}

/**
 * 使用可能かチェック（例外を投げない）
 */
export async function canUse(model: string, userId: string): Promise<UsageResult> {
  // 環境変数でバイパス
  if (process.env.DISABLE_USAGE_CHECK === '1') {
    return { ok: true, reason: 'disabled' }
  }

  try {
    const plan = await getPlanSafe(userId)
    const used = await getUsedSafe(userId)
    
    // プランごとの制限
    const limits: Record<string, number> = {
      'free': 5,
      'starter': 30,
      'pro': 100,
      'agency': 1000
    }
    
    const limit = limits[plan] || limits['free']
    
    if (used < limit) {
      return { ok: true, used, limit, plan }
    } else {
      return { 
        ok: false, 
        reason: 'limit_reached', 
        used, 
        limit, 
        plan 
      }
    }
  } catch (error) {
    console.error('Usage check exception:', error)
    // 失敗時は制限チェック失敗として明示
    return { ok: false, reason: 'usage_check_failed' }
  }
}

/**
 * 使用量を記録（失敗しても続行）
 */
export async function recordUsage(userId: string, model: string, details?: Record<string, any>): Promise<void> {
  try {
    await supabase
      .from('generation_audit')
      .insert({
        id: crypto.randomUUID(),
        user_id: userId,
        contract_ref: 'unknown',
        model,
        keywords_used: [],
        metrics: { total: 0.8 },
        verification_score: 0.8,
        cost_estimate_cents: 10,
        retries: 0,
        created_at: new Date().toISOString(),
        ...details
      })
  } catch (error) {
    console.warn('Usage recording failed:', error)
    // 記録失敗は無視して処理続行
  }
}