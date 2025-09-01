import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { purchasePrompt } from '@/lib/prompts'

// テスト環境専用：手動でプロンプト購入を記録
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

    // 開発環境またはテストモードでのみ動作
    const isTestMode = process.env.NODE_ENV !== 'production' || 
                      process.env.STRIPE_SECRET_KEY?.includes('sk_test_')

    if (!isTestMode) {
      return NextResponse.json({ error: 'この機能はテスト環境でのみ利用可能です' }, { status: 403 })
    }

    const userEmail = session.user.email

    try {
      // プロンプト購入を記録
      await purchasePrompt(userEmail, promptId)
      
      console.log(`Test purchase recorded: ${userEmail} -> ${promptId}`)
      
      return NextResponse.json({
        success: true,
        message: `プロンプト ${promptId} の購入を記録しました（テストモード）`,
        user: userEmail,
        promptId: promptId
      })

    } catch (error) {
      console.error('Test purchase error:', error)
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : '購入記録に失敗しました' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Test purchase API error:', error)
    return NextResponse.json({ error: 'API処理に失敗しました' }, { status: 500 })
  }
}