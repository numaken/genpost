// app/api/purchase-pack/route.ts - Pack購入API（Stripe連携）

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { createClient } from '@supabase/supabase-js'
import { checkPackEntitlement, createPackEntitlement } from '@/lib/packSystem'
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { packId, plan = 'basic' } = body

    if (!packId) {
      return NextResponse.json({ error: 'Pack IDが必要です' }, { status: 400 })
    }

    // Pack情報取得
    const { data: pack, error: packError } = await supabase
      .from('packs')
      .select('*')
      .eq('id', packId)
      .eq('is_active', true)
      .single()

    if (packError || !pack) {
      return NextResponse.json({ error: 'Packが見つかりません' }, { status: 404 })
    }

    // 既に購入済みかチェック
    const alreadyOwned = await checkPackEntitlement(session.user.id, packId)
    if (alreadyOwned) {
      return NextResponse.json({ error: '既に購入済みです' }, { status: 400 })
    }

    // 無料Packの場合は即座にentitlement作成
    if (pack.price === 0) {
      await createPackEntitlement(session.user.id, packId, plan)
      
      return NextResponse.json({
        success: true,
        message: 'Pack取得完了',
        packId,
        packName: pack.name
      })
    }

    // 有料Packの場合はStripe Checkoutセッション作成
    const checkoutSession = await stripe.checkout.sessions.create({
      customer_email: session.user.email,
      payment_method_types: ['card'],
      mode: plan === 'subscription' ? 'subscription' : 'payment',
      
      line_items: [{
        price_data: {
          currency: 'jpy',
          unit_amount: pack.price,
          product_data: {
            name: pack.name,
            description: pack.description || `panolabo AI Pack: ${pack.name}`,
            images: pack.featured_image ? [pack.featured_image] : [],
            metadata: {
              pack_id: packId,
              pack_version: pack.version.toString(),
              pack_type: pack.type
            }
          },
          ...(plan === 'subscription' && {
            recurring: {
              interval: 'month'
            }
          })
        },
        quantity: 1
      }],

      success_url: `${process.env.NEXTAUTH_URL}/pack-purchase-success?session_id={CHECKOUT_SESSION_ID}&pack_id=${packId}`,
      cancel_url: `${process.env.NEXTAUTH_URL}?pack_purchase_cancelled=1`,

      metadata: {
        user_id: session.user.id,
        pack_id: packId,
        plan: plan
      },

      // 購入完了時のWebhook設定
      payment_intent_data: {
        metadata: {
          user_id: session.user.id,
          pack_id: packId,
          plan: plan
        }
      }
    })

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id
    })

  } catch (error: any) {
    console.error('Pack purchase error:', error)
    return NextResponse.json({
      error: 'Pack購入処理に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}

// Pack購入完了の確認API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')
    
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id が必要です' }, { status: 400 })
    }

    // Stripe セッション情報取得
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    
    if (session.payment_status === 'paid') {
      const userId = session.metadata?.user_id
      const packId = session.metadata?.pack_id
      const plan = session.metadata?.plan || 'basic'

      if (userId && packId) {
        // Entitlement作成（重複チェック付き）
        const alreadyOwned = await checkPackEntitlement(userId, packId)
        if (!alreadyOwned) {
          await createPackEntitlement(userId, packId, plan as any)
        }

        return NextResponse.json({
          success: true,
          purchased: true,
          packId,
          sessionId
        })
      }
    }

    return NextResponse.json({
      success: false,
      purchased: false,
      paymentStatus: session.payment_status
    })

  } catch (error: any) {
    console.error('Pack purchase verification error:', error)
    return NextResponse.json({
      error: 'Pack購入確認に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}