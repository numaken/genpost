import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// プランの制限設定（現実的な月間上限に調整）
export const PLAN_LIMITS = {
  free: { 
    maxSharedApiArticles: 5, 
    dailyLimit: 1, 
    maxSites: 1, 
    name: 'フリープラン' 
  },
  starter: { 
    maxSharedApiArticles: 30, 
    dailyLimit: 1, 
    maxSites: 2, 
    softCap: true,
    name: 'スターター' 
  },
  pro: { 
    maxSharedApiArticles: 120, 
    dailyLimit: 5, 
    maxSites: 5, 
    softCap: true,
    name: 'プロプラン' 
  },
  agency: { 
    maxSharedApiArticles: 500, 
    dailyLimit: 20, 
    maxSites: 20, 
    seats: 5,
    softCap: true,
    name: 'エージェンシー' 
  }
} as const

export type PlanType = keyof typeof PLAN_LIMITS

export interface UserUsage {
  sharedApiCount: number
  userApiCount: number
  totalCount: number
  currentMonth: string
  dailyCount: number
  currentDate: string
}

export interface UserSubscription {
  planType: PlanType
  maxSharedApiArticles: number
  dailyLimit: number
  maxSites: number
  seats?: number
  softCap?: boolean
  isActive: boolean
  endsAt?: string
}

// ユーザーの現在月使用量を取得
export async function getUserCurrentUsage(userId: string): Promise<UserUsage> {
  const { data, error } = await supabase.rpc('get_user_current_month_usage', {
    p_user_id: userId
  })
  
  if (error) throw error
  
  const usage = data[0] || { shared_api_count: 0, user_api_count: 0, total_count: 0 }
  
  return {
    sharedApiCount: usage.shared_api_count,
    userApiCount: usage.user_api_count,
    totalCount: usage.total_count,
    currentMonth: usage.current_month
  }
}

// ユーザーのサブスクリプション情報を取得
export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()
  
  if (error || !data) {
    // サブスクリプションが存在しない場合はフリープランとして扱う
    return {
      planType: 'free',
      maxSharedApiArticles: PLAN_LIMITS.free.maxSharedApiArticles,
      isActive: true
    }
  }
  
  return {
    planType: data.plan_type as PlanType,
    maxSharedApiArticles: data.max_shared_api_articles,
    isActive: data.is_active,
    endsAt: data.ends_at
  }
}

// 共有APIキーでの生成が可能かチェック（デイリー制限とソフトキャップ対応）
export async function canUseSharedApiKey(userId: string, userApiKey?: string): Promise<{
  canUse: boolean
  reason?: string
  usage?: UserUsage
  subscription?: UserSubscription
  bypassLimits?: boolean
}> {
  try {
    const [usage, subscription] = await Promise.all([
      getUserCurrentUsage(userId),
      getUserSubscription(userId)
    ])
    
    // BYOK（ユーザー自身のAPIキー）が設定されている場合は制限を緩和
    if (userApiKey) {
      return {
        canUse: true,
        usage,
        subscription,
        bypassLimits: true
      }
    }
    
    // デイリー制限チェック
    if (usage.dailyCount >= subscription.dailyLimit) {
      return {
        canUse: false,
        reason: `デイリー上限${subscription.dailyLimit}記事/日に達しました。明日まで再試行してください。`,
        usage,
        subscription
      }
    }
    
    // 月間制限チェック（ソフトキャップ考慮）
    const softCapLimit = subscription.softCap 
      ? Math.floor(subscription.maxSharedApiArticles * 1.1) // +10%
      : subscription.maxSharedApiArticles
      
    if (usage.sharedApiCount >= softCapLimit) {
      return {
        canUse: false,
        reason: subscription.softCap 
          ? `月間上限${subscription.maxSharedApiArticles}記事+ソフトキャップ10%の制限に達しました。ユーザーAPIキーを設定するか、プランをアップグレードしてください。`
          : `${subscription.maxSharedApiArticles}記事/月の制限に達しました。ユーザーAPIキーを設定するか、プランをアップグレードしてください。`,
        usage,
        subscription
      }
    }
    
    return {
      canUse: true,
      usage,
      subscription
    }
  } catch (error) {
    console.error('Usage check error:', error)
    return {
      canUse: false,
      reason: '使用制限の確認に失敗しました'
    }
  }
}

// 使用量を増加
export async function incrementUsage(userId: string, isSharedApi: boolean = true) {
  const { error } = await supabase.rpc('increment_user_usage', {
    p_user_id: userId,
    p_is_shared_api: isSharedApi
  })
  
  if (error) throw error
}

// ユーザーのサブスクリプションを作成/更新
export async function updateUserSubscription(
  userId: string,
  planType: PlanType,
  stripeSubscriptionId?: string
) {
  const planLimit = PLAN_LIMITS[planType]
  
  const { data, error } = await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      plan_type: planType,
      max_shared_api_articles: planLimit.maxSharedApiArticles,
      is_active: true,
      stripe_subscription_id: stripeSubscriptionId,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
  
  if (error) throw error
  return data
}