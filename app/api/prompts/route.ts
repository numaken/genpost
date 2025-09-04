import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { getAllPrompts, getFreePrompts, hasUserPurchased } from '@/lib/prompts'

export async function GET(request: NextRequest) {
  try {
    // セッション取得（任意）
    const session = await getServerSession()
    const userId = session?.user?.email

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') // 'free', 'purchased', 'all'
    const industry = searchParams.get('industry') // 業界フィルター

    // 全プロンプトを取得
    let prompts = await getAllPrompts()

    // 業界フィルター
    if (industry) {
      prompts = prompts.filter(p => p.industry === industry)
    }

    // ログイン済みの場合：購入状態を追加
    // 未ログインの場合：基本情報のみ返す
    const promptsWithStatus = userId ? 
      await Promise.all(
        prompts.map(async (prompt) => {
          const purchased = await hasUserPurchased(userId, prompt.prompt_id)
          return {
            ...prompt,
            purchased,
            available: prompt.is_free || purchased
          }
        })
      ) :
      prompts.map(prompt => ({
        ...prompt,
        purchased: false,
        available: prompt.is_free  // 未ログインは無料のみ利用可能
      }))

    // フィルター適用
    let filteredPrompts = promptsWithStatus
    if (filter === 'free') {
      filteredPrompts = promptsWithStatus.filter(p => p.is_free)
    } else if (filter === 'purchased') {
      // 購入済みフィルターはログイン必須
      if (!userId) {
        return NextResponse.json({ error: '購入済み確認にはログインが必要です' }, { status: 401 })
      }
      filteredPrompts = promptsWithStatus.filter(p => !p.is_free && p.purchased)
    } else if (filter === 'available') {
      filteredPrompts = promptsWithStatus.filter(p => p.available)
    }

    // 業界別にグループ化
    const groupedPrompts = filteredPrompts.reduce((acc, prompt) => {
      if (!acc[prompt.industry]) {
        acc[prompt.industry] = []
      }
      acc[prompt.industry].push(prompt)
      return acc
    }, {} as Record<string, typeof filteredPrompts>)

    return NextResponse.json({
      prompts: filteredPrompts,
      grouped: groupedPrompts,
      total: filteredPrompts.length
    })

  } catch (error) {
    console.error('Prompts API error:', error)
    return NextResponse.json({ error: 'プロンプト取得に失敗しました' }, { status: 500 })
  }
}