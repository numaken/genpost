import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import Stripe from 'stripe'
import { getPromptById, purchasePrompt } from '@/lib/prompts'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { promptId } = body

    if (!promptId) {
      return NextResponse.json({ error: 'プロンプトIDが必要です' }, { status: 400 })
    }

    // プロンプト情報を取得
    const prompt = await getPromptById(promptId)
    if (!prompt) {
      return NextResponse.json({ error: '無効なプロンプトです' }, { status: 400 })
    }

    if (prompt.is_free) {
      return NextResponse.json({ error: '無料プロンプトは購入不要です' }, { status: 400 })
    }

    // Stripe Checkoutセッションを作成
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: prompt.name,
              description: prompt.description,
              images: [],
              metadata: {
                prompt_id: prompt.prompt_id,
                industry: prompt.industry,
                purpose: prompt.purpose
              }
            },
            unit_amount: prompt.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/`,
      metadata: {
        user_id: session.user.email,
        prompt_id: prompt.prompt_id
      },
      customer_email: session.user.email,
    })

    return NextResponse.json({ url: checkoutSession.url })

  } catch (error) {
    console.error('Purchase error:', error)
    return NextResponse.json({ error: '購入処理中にエラーが発生しました' }, { status: 500 })
  }
}