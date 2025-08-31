import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { purchasePrompt } from '@/lib/prompts'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia'
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // 決済完了イベントを処理
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      const userId = session.metadata?.user_id
      const promptId = session.metadata?.prompt_id

      if (userId && promptId) {
        try {
          // データベースに購入履歴を記録
          await purchasePrompt(userId, promptId)
          console.log(`Purchase recorded: ${userId} -> ${promptId}`)
        } catch (error) {
          console.error('Failed to record purchase:', error)
          return NextResponse.json({ error: 'Failed to record purchase' }, { status: 500 })
        }
      } else {
        console.error('Missing metadata in checkout session:', session.metadata)
      }
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}