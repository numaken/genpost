// app/api/subscribe-plan/route.ts - プラン購入API（Stripe連携）

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { createClient } from '@supabase/supabase-js'
import { authOptions } from '../auth/[...nextauth]/route'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// プラン定義（料金表と一致）
const PLANS = {
  'starter': {
    name: 'スターター',
    price_monthly: 2480,
    price_yearly: 24800,
    limits: { sites: 2, posts_per_month: 30, seats: 1 },
    features: ['見出し自然化', '人肌フィルタ', 'WP自動投稿']
  },
  'pro': {
    name: 'プロプラン',
    price_monthly: 4980,
    price_yearly: 49800,
    limits: { sites: 5, posts_per_month: 100, seats: 1 },
    features: ['推敲フロー', 'タイトル自然化', '重複チェック']
  },
  'agency': {
    name: 'エージェンシー',
    price_monthly: 9800,
    price_yearly: 98000,
    limits: { sites: 20, posts_per_month: 500, seats: 5 },
    features: ['Packライブラリ', 'A/B最適化', 'チーム機能']
  }
} as const

type PlanId = keyof typeof PLANS

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { planId, isYearly = false } = body

    if (!planId || !(planId in PLANS)) {
      return NextResponse.json({ error: '無効なプランIDです' }, { status: 400 })
    }

    const plan = PLANS[planId as PlanId]
    const amount = isYearly ? plan.price_yearly : plan.price_monthly
    const interval = isYearly ? 'year' : 'month'

    // 現在のサブスクリプション状況をチェック
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single()

    if (existingSubscription) {
      return NextResponse.json({ 
        error: '既にアクティブなサブスクリプションがあります。プラン変更は管理画面から行ってください。' 
      }, { status: 400 })
    }

    // Stripe Checkoutセッション作成
    const checkoutSession = await stripe.checkout.sessions.create({
      customer_email: session.user.email,
      payment_method_types: ['card'],
      mode: 'subscription',
      
      line_items: [{
        price_data: {
          currency: 'jpy',
          unit_amount: amount,
          product_data: {
            name: plan.name,
            description: `panolabo AI ${plan.name} - ${plan.features.slice(0, 3).join(', ')}等`,
            metadata: {
              plan_id: planId,
              plan_name: plan.name
            }
          },
          recurring: {
            interval: interval as 'month' | 'year'
          }
        },
        quantity: 1
      }],

      success_url: `${process.env.NEXTAUTH_URL}/subscription-success?session_id={CHECKOUT_SESSION_ID}&plan_id=${planId}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?subscription_cancelled=1`,

      metadata: {
        user_id: session.user.id,
        plan_id: planId,
        is_yearly: isYearly.toString()
      },

      subscription_data: {
        metadata: {
          user_id: session.user.id,
          plan_id: planId,
          is_yearly: isYearly.toString()
        }
      }
    })

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
      planName: plan.name,
      amount,
      interval
    })

  } catch (error: any) {
    console.error('Subscription error:', error)
    return NextResponse.json({
      error: 'サブスクリプション処理に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}

// サブスクリプション完了確認API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')
    
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id が必要です' }, { status: 400 })
    }

    // Stripe セッション情報取得
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId)
    
    if (checkoutSession.payment_status === 'paid' && checkoutSession.subscription) {
      const userId = checkoutSession.metadata?.user_id
      const planId = checkoutSession.metadata?.plan_id
      const isYearly = checkoutSession.metadata?.is_yearly === 'true'

      if (userId && planId && planId in PLANS) {
        const subscription = await stripe.subscriptions.retrieve(checkoutSession.subscription as string)
        
        // サブスクリプション情報をDBに保存
        const { error } = await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: userId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            plan_id: planId,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000),
            current_period_end: new Date(subscription.current_period_end * 1000),
            is_yearly: isYearly,
            updated_at: new Date()
          })

        if (error) {
          console.error('Subscription save error:', error)
        }

        return NextResponse.json({
          success: true,
          subscribed: true,
          planId,
          planName: PLANS[planId as PlanId].name,
          sessionId
        })
      }
    }

    return NextResponse.json({
      success: false,
      subscribed: false,
      paymentStatus: checkoutSession.payment_status
    })

  } catch (error: any) {
    console.error('Subscription verification error:', error)
    return NextResponse.json({
      error: 'サブスクリプション確認に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}