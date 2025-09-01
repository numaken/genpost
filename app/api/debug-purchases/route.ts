import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// デバッグ用：ユーザーの購入情報を詳細表示
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    const userEmail = session.user.email

    // user_promptsテーブルの全レコードを取得
    const { data: userPrompts, error: userPromptsError } = await supabase
      .from('user_prompts')
      .select('*')
      .eq('user_id', userEmail)

    // promptsテーブルのサンプルデータを取得
    const { data: prompts, error: promptsError } = await supabase
      .from('prompts')
      .select('id, prompt_id, name, is_free')
      .limit(5)

    return NextResponse.json({
      debug: {
        userEmail,
        userPrompts: {
          data: userPrompts,
          error: userPromptsError,
          count: userPrompts?.length || 0
        },
        promptsSample: {
          data: prompts,
          error: promptsError
        },
        environment: {
          nodeEnv: process.env.NODE_ENV,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      }
    })

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({ 
      error: 'デバッグ処理に失敗',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}