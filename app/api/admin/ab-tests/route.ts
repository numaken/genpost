import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 管理者権限チェック
const ADMIN_EMAILS = ['numaken@gmail.com'] // 管理者メールアドレス

async function checkAdminPermission(session: any) {
  if (!session?.user?.email) {
    return false
  }
  return ADMIN_EMAILS.includes(session.user.email)
}

// A/Bテスト設定一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!await checkAdminPermission(session)) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    const { data: tests, error } = await supabase
      .from('prompt_ab_test_config')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ tests })

  } catch (error) {
    console.error('A/Bテスト取得エラー:', error)
    return NextResponse.json({ error: 'A/Bテスト設定の取得に失敗しました' }, { status: 500 })
  }
}

// A/Bテスト設定作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!await checkAdminPermission(session)) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    const body = await request.json()
    const {
      prompt_id,
      test_name,
      version_a = 'v1.0',
      version_b = 'v2.0',
      traffic_split = 0.3,
      target_sample_size = 50
    } = body

    if (!prompt_id || !test_name) {
      return NextResponse.json({ error: 'prompt_idとtest_nameは必須です' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('prompt_ab_test_config')
      .insert([{
        prompt_id,
        test_name,
        version_a,
        version_b,
        traffic_split,
        target_sample_size,
        is_active: false // デフォルトは非アクティブ
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ test: data })

  } catch (error) {
    console.error('A/Bテスト作成エラー:', error)
    return NextResponse.json({ error: 'A/Bテスト設定の作成に失敗しました' }, { status: 500 })
  }
}

// A/Bテスト設定更新
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!await checkAdminPermission(session)) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    const body = await request.json()
    const { id, is_active, traffic_split } = body

    if (!id) {
      return NextResponse.json({ error: 'idは必須です' }, { status: 400 })
    }

    const updateData: any = {}
    if (typeof is_active === 'boolean') {
      updateData.is_active = is_active
    }
    if (typeof traffic_split === 'number') {
      updateData.traffic_split = traffic_split
    }

    const { data, error } = await supabase
      .from('prompt_ab_test_config')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ test: data })

  } catch (error) {
    console.error('A/Bテスト更新エラー:', error)
    return NextResponse.json({ error: 'A/Bテスト設定の更新に失敗しました' }, { status: 500 })
  }
}