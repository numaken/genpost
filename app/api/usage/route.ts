import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { getUserCurrentUsage, getUserSubscription, PLAN_LIMITS } from '@/lib/usage-limits'
import { getUserApiKey } from '@/lib/api-keys'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    const userId = session.user.email

    // 使用量とサブスクリプション情報を並列取得
    const [usage, subscription, hasUserApiKey] = await Promise.all([
      getUserCurrentUsage(userId),
      getUserSubscription(userId),
      getUserApiKey(userId, 'openai').then(key => !!key)
    ])

    // プラン名を取得
    const planName = PLAN_LIMITS[subscription.planType]?.name || 'スタータープラン'

    return NextResponse.json({
      sharedApiCount: usage.sharedApiCount,
      userApiCount: usage.userApiCount,
      totalCount: usage.totalCount,
      currentMonth: usage.currentMonth,
      maxSharedApiArticles: subscription.maxSharedApiArticles,
      planType: subscription.planType,
      planName,
      hasUserApiKey
    })

  } catch (error) {
    console.error('Usage API error:', error)
    return NextResponse.json({ error: '使用状況の取得に失敗しました' }, { status: 500 })
  }
}