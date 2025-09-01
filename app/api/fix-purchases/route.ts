import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 一時的な修正用エンドポイント - 購入済みデータの不整合を修正
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    const userEmail = session.user.email

    console.log('Starting purchase data fix for user:', userEmail)

    // 現在のuser_promptsデータを取得
    const { data: userPrompts, error: fetchError } = await supabase
      .from('user_prompts')
      .select('*')
      .eq('user_id', userEmail)

    if (fetchError) {
      console.error('Failed to fetch user prompts:', fetchError)
      return NextResponse.json({ error: 'データ取得に失敗' }, { status: 500 })
    }

    console.log('Found user_prompts:', userPrompts)

    if (!userPrompts || userPrompts.length === 0) {
      return NextResponse.json({ 
        message: '購入済みプロンプトが見つかりません',
        fixed: 0
      })
    }

    // 数値IDのレコードを修正
    let fixedCount = 0
    for (const purchase of userPrompts) {
      if (typeof purchase.prompt_id === 'number') {
        // 数値IDから対応するprompt_idを取得
        const { data: prompt } = await supabase
          .from('prompts')
          .select('prompt_id')
          .eq('id', purchase.prompt_id)
          .single()

        if (prompt) {
          // prompt_idを文字列に更新
          const { error: updateError } = await supabase
            .from('user_prompts')
            .update({ prompt_id: prompt.prompt_id })
            .eq('id', purchase.id)

          if (!updateError) {
            fixedCount++
            console.log(`Fixed purchase: ${purchase.prompt_id} -> ${prompt.prompt_id}`)
          }
        }
      }
    }

    return NextResponse.json({ 
      message: `${fixedCount}件の購入データを修正しました`,
      fixed: fixedCount
    })

  } catch (error) {
    console.error('Fix purchases error:', error)
    return NextResponse.json({ error: '修正処理に失敗' }, { status: 500 })
  }
}