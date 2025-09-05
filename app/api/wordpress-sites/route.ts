import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { 
  getUserWordPressSites, 
  getUserSiteLimit, 
  addWordPressSite,
  updateWordPressSite,
  deleteWordPressSite 
} from '@/lib/wordpress-sites'
import { authOptions } from '../auth/[...nextauth]/route'

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

// WordPress サイト更新
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { site_id, ...updateData } = body

    if (!site_id) {
      return NextResponse.json({ error: 'サイトIDが必要です' }, { status: 400 })
    }

    const site = await updateWordPressSite(session.user.email, site_id, updateData)

    return NextResponse.json({ site })

  } catch (error) {
    console.error('WordPress site update error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'サイトの更新に失敗しました' 
    }, { status: 500 })
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