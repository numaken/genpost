// lib/subscription.ts - サブスクリプション管理

import { createClient } from '@supabase/supabase-js'
import { checkSuperUserLimits } from './superuser'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface UserSubscription {
  id: string
  user_id: string
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  plan_id: string
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing'
  current_period_start: string
  current_period_end: string
  is_yearly: boolean
  created_at: string
  updated_at: string
}

export interface PlanLimits {
  sites: number
  posts_per_month: number
  seats: number
}

// プラン定義（subscribe-plan/route.tsと同期）
export const PLAN_DEFINITIONS = {
  'free': {
    name: 'フリー',
    limits: { sites: 2, posts_per_month: 5, seats: 1 },
    features: ['基本生成', 'WordPress投稿']
  },
  'starter': {
    name: 'スターター',
    limits: { sites: 2, posts_per_month: 30, seats: 1 },
    features: ['見出し自然化', '人肌フィルタ', 'WP自動投稿']
  },
  'pro': {
    name: 'プロプラン', 
    limits: { sites: 5, posts_per_month: 100, seats: 1 },
    features: ['推敲フロー', 'タイトル自然化', '重複チェック']
  },
  'agency': {
    name: 'エージェンシー',
    limits: { sites: 20, posts_per_month: 500, seats: 5 },
    features: ['Packライブラリ', 'A/B最適化', 'チーム機能']
  }
} as const

export type PlanId = keyof typeof PLAN_DEFINITIONS

/**
 * ユーザーの現在のサブスクリプションを取得
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (error || !data) {
    return null
  }

  return data as UserSubscription
}

/**
 * ユーザーの現在のプランを取得
 */
export async function getUserPlan(userId: string): Promise<{ planId: PlanId; limits: PlanLimits; name: string }> {
  const subscription = await getUserSubscription(userId)
  
  const planId = subscription?.plan_id as PlanId || 'free'
  const planDef = PLAN_DEFINITIONS[planId] || PLAN_DEFINITIONS.free
  
  return {
    planId,
    limits: planDef.limits,
    name: planDef.name
  }
}

/**
 * プラン制限をチェック
 */
export async function checkPlanLimits(userId: string, action: 'generate_article' | 'add_site' | 'add_seat', userEmail?: string) {
  // スーパーユーザーチェック
  const superUserResult = checkSuperUserLimits(userEmail)
  if (superUserResult) {
    return {
      allowed: true,
      used: 0,
      limit: 999999,
      planId: 'superuser'
    }
  }

  const { planId, limits } = await getUserPlan(userId)
  
  switch (action) {
    case 'generate_article':
      // 今月の生成記事数をチェック
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      
      const { count: articlesThisMonth } = await supabase
        .from('usage_logs')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString())
        .eq('action', 'generate_article')
      
      return {
        allowed: (articlesThisMonth || 0) < limits.posts_per_month,
        used: articlesThisMonth || 0,
        limit: limits.posts_per_month,
        planId
      }
      
    case 'add_site':
      // 接続済みサイト数をチェック
      const { count: sitesCount } = await supabase
        .from('wordpress_sites')
        .select('*', { count: 'exact' })
        .eq('user_email', userId) // user_idではなくuser_emailでチェック（既存のスキーマに合わせて）
      
      return {
        allowed: (sitesCount || 0) < limits.sites,
        used: sitesCount || 0,
        limit: limits.sites,
        planId
      }
      
    case 'add_seat':
      // 席数をチェック（将来実装）
      return {
        allowed: true, // 暫定的にtrue
        used: 1,
        limit: limits.seats,
        planId
      }
  }
}

/**
 * 使用量を記録
 */
export async function recordUsageLog(userId: string, action: string, metadata?: any) {
  const { error } = await supabase
    .from('usage_logs')
    .insert({
      user_id: userId,
      action,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    })
    
  if (error) {
    console.error('Usage log error:', error)
  }
}

/**
 * ユーザーのプラン情報を表示用に整形
 */
export async function getUserPlanInfo(userId: string) {
  const subscription = await getUserSubscription(userId)
  const { planId, limits, name } = await getUserPlan(userId)
  
  // 使用量取得
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  
  const { count: articlesUsed } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString())
    .eq('action', 'generate_article')
  
  const { count: sitesUsed } = await supabase
    .from('wordpress_sites')
    .select('*', { count: 'exact' })
    .eq('user_email', userId)
  
  return {
    planId,
    planName: name,
    limits,
    usage: {
      articles: articlesUsed || 0,
      sites: sitesUsed || 0,
      seats: 1 // 暫定
    },
    subscription: subscription ? {
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      isYearly: subscription.is_yearly
    } : null
  }
}