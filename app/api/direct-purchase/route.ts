import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 直接購入記録 - より制限が少ない方法
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

    const userEmail = session.user.email

    try {
      // まずpromptsテーブルから正しいUUIDを取得
      const { data: promptData, error: promptError } = await supabase
        .from('prompts')
        .select('id, prompt_id')
        .eq('prompt_id', promptId)
        .single()

      if (promptError || !promptData) {
        console.error('Prompt lookup error:', promptError)
        return NextResponse.json({ 
          error: 'プロンプトが見つかりません',
          details: promptError?.message || 'プロンプトIDが無効です'
        }, { status: 400 })
      }

      // user_promptsテーブルに挿入（UUIDとして）
      const { data, error } = await supabase
        .from('user_prompts')
        .insert({
          user_id: userEmail,
          prompt_id: promptData.id, // UUIDを使用
          purchased_at: new Date().toISOString(),
          is_active: true
        })
        .select()

      if (error) {
        console.error('Direct purchase insert error:', error)
        return NextResponse.json({ 
          error: 'データベース挿入エラー',
          details: error.message
        }, { status: 500 })
      }

      console.log(`Direct purchase recorded: ${userEmail} -> ${promptId}`)
      console.log('Insert result:', data)

      return NextResponse.json({
        success: true,
        message: `プロンプト ${promptId} の購入を記録しました`,
        user: userEmail,
        promptId: promptId,
        data: data
      })

    } catch (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ 
        error: 'データベース処理エラー',
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Direct purchase API error:', error)
    return NextResponse.json({ 
      error: 'API処理エラー',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}