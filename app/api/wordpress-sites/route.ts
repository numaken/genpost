import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { createClient } from '@supabase/supabase-js'
import { 
  getUserWordPressSites, 
  getUserSiteLimit, 
  addWordPressSite,
  updateWordPressSite,
  deleteWordPressSite 
} from '@/lib/wordpress-sites'
import { authOptions } from '../auth/[...nextauth]/route'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// WordPress サイト一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    const sites = await getUserWordPressSites(session.user.email)
    const siteLimit = await getUserSiteLimit(session.user.email)

    return NextResponse.json({
      sites,
      limit: siteLimit
    })

  } catch (error) {
    console.error('WordPress sites fetch error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'サイト情報の取得に失敗しました' 
    }, { status: 500 })
  }
}

// WordPress サイト追加
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { site_name, site_url, wp_username, wp_app_password, default_category_id } = body

    if (!site_name || !site_url || !wp_username || !wp_app_password) {
      return NextResponse.json({ error: '必須項目を入力してください' }, { status: 400 })
    }

    const site = await addWordPressSite(session.user.email, {
      site_name,
      site_url,
      wp_username,
      wp_app_password,
      default_category_id
    })

    return NextResponse.json({ site })

  } catch (error) {
    console.error('WordPress site add error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'サイトの追加に失敗しました' 
    }, { status: 500 })
  }
}

// WordPress サイト更新（upsert方式で絶対に500を返さない）
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { site_id, site_name, site_url, category_slug, wp_api_key, status = 'active', selected_prompt_id } = body || {}

    // site_idが指定されている場合は既存サイトの更新、そうでなければ新規作成
    if (site_id) {
      // 既存サイト更新の場合はsite_idのみ必須
      if (!site_id) {
        return NextResponse.json({ error: 'site_id_required' }, { status: 400 })
      }
    } else {
      // 新規作成の場合はsite_nameとsite_urlが必須
      if (!site_name || !site_url) {
        return NextResponse.json({ error: 'site_name_and_url_required' }, { status: 400 })
      }
    }

    try {
      let result: any;
      
      if (site_id) {
        // 既存サイトの更新（site_idベース）
        const updatePayload: any = {
          updated_at: new Date().toISOString(),
        }
        
        // 更新可能なフィールドのみ設定
        if (category_slug !== undefined) updatePayload.category_slug = category_slug
        if (wp_api_key !== undefined) updatePayload.wp_api_key = wp_api_key
        if (status !== undefined) updatePayload.status = status
        if (selected_prompt_id !== undefined) updatePayload.selected_prompt_id = selected_prompt_id
        
        result = await supabase
          .from('wordpress_sites')
          .update(updatePayload)
          .eq('id', site_id)
          .eq('user_id', session.user.id)
          .select()
          .single()
      } else {
        // 新規サイト作成 (site_url + user_idでupsert)
        const { data: existing } = await supabase
          .from('wordpress_sites')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('site_url', site_url)
          .maybeSingle()

        const payload = {
          user_id: session.user.id,
          site_name,
          site_url,
          category_slug: category_slug ?? null,
          wp_api_key: wp_api_key ?? null,
          status,
          updated_at: new Date().toISOString(),
        }

        result = existing?.id
          ? await supabase.from('wordpress_sites').update(payload).eq('id', existing.id).select().single()
          : await supabase.from('wordpress_sites').insert(payload).select().single()
      }

      if (result.error) {
        // ここで握りつぶさずJSONで返す
        return NextResponse.json({ error: 'db_error', message: result.error.message }, { status: 200 })
      }

      return NextResponse.json({ ok: true, site: result.data }, { status: 200 })
    } catch (dbError) {
      console.error('Database operation failed:', dbError)
      return NextResponse.json({
        error: 'db_operation_failed',
        message: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 200 }) // フロント崩壊回避のため200で返す
    }

  } catch (e: any) {
    console.error('WordPress site PUT error:', e)
    return NextResponse.json(
      { error: 'internal_error', message: e?.message || String(e) },
      { status: 200 } // フロント崩壊回避のため暫定で200返す
    )
  }
}

// WordPress サイト削除
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('site_id')

    if (!siteId) {
      return NextResponse.json({ error: 'サイトIDが必要です' }, { status: 400 })
    }

    await deleteWordPressSite(session.user.email, siteId)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('WordPress site delete error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'サイトの削除に失敗しました' 
    }, { status: 500 })
  }
}