import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import Stripe from 'stripe'
import { createUnlimitedSitePurchase } from '@/lib/wordpress-sites'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    // 購入レコード作成
    const purchase = await createUnlimitedSitePurchase(session.user.email)

    // Stripe Checkout セッション作成
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: 'genpost 無制限サイトプラン（年額）',
              description: 'WordPressサイトを無制限で登録・管理できる年額プランです。',
              images: ['https://genpost.panolabollc.com/images/unlimited-sites-plan.png']
            },
            unit_amount: 2980,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}?payment=success&type=unlimited-sites`,
      cancel_url: `${process.env.NEXTAUTH_URL}?payment=cancelled`,
      customer_email: session.user.email,
      metadata: {
        user_email: session.user.email,
        purchase_id: purchase.id,
        purchase_type: 'unlimited_sites'
      }
    })

    return NextResponse.json({ 
      url: checkoutSession.url,
      session_id: checkoutSession.id 
    })

  } catch (error) {
    console.error('Unlimited sites purchase error:', error)
    return NextResponse.json({ 
      error: '無制限サイトプランの購入処理に失敗しました' 
    }, { status: 500 })
  }
}