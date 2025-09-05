import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { getUserCurrentUsage, getUserSubscription, PLAN_LIMITS } from '@/lib/usage-limits'
import { getUserApiKey } from '@/lib/api-keys'
import { authOptions } from '../auth/[...nextauth]/route'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const userId = session.user.email

    try {
      // 使用量とサブスクリプション情報を並列取得（個別エラーハンドリング）
      const [usage, subscription, hasUserApiKey] = await Promise.allSettled([
        getUserCurrentUsage(userId).catch(() => ({
          sharedApiCount: 0,
          userApiCount: 0,
          totalCount: 0,
          currentMonth: new Date().toISOString().slice(0, 7)
        })),
        getUserSubscription(userId).catch(() => ({
          planType: 'starter',
          maxSharedApiArticles: 25
        })),
        getUserApiKey(userId, 'openai').then(key => !!key).catch(() => false)
      ])

      // 結果を安全に取得
      const usageData = usage.status === 'fulfilled' ? usage.value : {
        sharedApiCount: 0,
        userApiCount: 0,
        totalCount: 0,
        currentMonth: new Date().toISOString().slice(0, 7)
      }

      const subscriptionData = subscription.status === 'fulfilled' ? subscription.value : {
        planType: 'starter',
        maxSharedApiArticles: 25
      }

      const hasApiKey = hasUserApiKey.status === 'fulfilled' ? hasUserApiKey.value : false

      // プラン名を安全に取得
      const planName = PLAN_LIMITS[subscriptionData.planType]?.name || 'スタータープラン'

      return NextResponse.json({
        sharedApiCount: usageData.sharedApiCount || 0,
        userApiCount: usageData.userApiCount || 0,
        totalCount: usageData.totalCount || 0,
        currentMonth: usageData.currentMonth || new Date().toISOString().slice(0, 7),
        maxSharedApiArticles: subscriptionData.maxSharedApiArticles || 25,
        planType: subscriptionData.planType || 'starter',
        planName,
        hasUserApiKey: hasApiKey
      })

    } catch (dataError) {
      // データ取得エラーでも基本構造は返す
      console.error('Usage API data error:', dataError)
      return NextResponse.json({
        sharedApiCount: 0,
        userApiCount: 0,
        totalCount: 0,
        currentMonth: new Date().toISOString().slice(0, 7),
        maxSharedApiArticles: 25,
        planType: 'starter',
        planName: 'スタータープラン',
        hasUserApiKey: false,
        warning: 'fallback: data unavailable'
      })
    }

  } catch (error: any) {
    console.error('Usage API error:', error)
    return NextResponse.json({ 
      error: 'internal_error', 
      message: error?.message || String(error) 
    }, { status: 500 })
  }
}