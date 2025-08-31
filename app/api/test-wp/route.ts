import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wpSiteUrl, wpUser, wpAppPass, categoryId } = body

    if (!wpSiteUrl || !wpUser || !wpAppPass) {
      return NextResponse.json({ error: 'WordPress設定が不完全です' }, { status: 400 })
    }

    // WordPress REST API接続テスト
    console.log('Testing WordPress connection...')
    console.log('Site URL:', wpSiteUrl)
    console.log('User:', wpUser)
    console.log('Category ID:', categoryId)

    // まずサイトの基本情報を取得
    const siteResponse = await fetch(`${wpSiteUrl}/wp-json/wp/v2`)
    if (!siteResponse.ok) {
      return NextResponse.json({
        error: 'WordPress REST APIに接続できません',
        details: {
          status: siteResponse.status,
          statusText: siteResponse.statusText,
          url: `${wpSiteUrl}/wp-json/wp/v2`
        }
      }, { status: 400 })
    }

    // 認証テスト
    const authHeader = `Basic ${Buffer.from(`${wpUser}:${wpAppPass}`).toString('base64')}`
    const authResponse = await fetch(`${wpSiteUrl}/wp-json/wp/v2/users/me`, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      }
    })

    if (!authResponse.ok) {
      const errorData = await authResponse.text()
      return NextResponse.json({
        error: 'WordPress認証に失敗しました',
        details: {
          status: authResponse.status,
          statusText: authResponse.statusText,
          response: errorData,
          authHeader: authHeader.substring(0, 20) + '...'
        }
      }, { status: 401 })
    }

    const userData = await authResponse.json()

    // テスト投稿を作成
    const testPostResponse = await fetch(`${wpSiteUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'genpost 接続テスト - ' + new Date().toLocaleString('ja-JP'),
        content: 'これはgenpostからの接続テストです。正常に投稿できれば成功です。',
        status: 'draft',
        categories: categoryId ? [parseInt(categoryId)] : []
      })
    })

    if (!testPostResponse.ok) {
      const errorData = await testPostResponse.text()
      return NextResponse.json({
        error: 'テスト投稿に失敗しました',
        details: {
          status: testPostResponse.status,
          statusText: testPostResponse.statusText,
          response: errorData
        }
      }, { status: 400 })
    }

    const postData = await testPostResponse.json()

    return NextResponse.json({
      success: true,
      message: 'WordPress接続テスト成功',
      site: wpSiteUrl,
      user: userData,
      testPost: {
        id: postData.id,
        title: postData.title.rendered,
        link: postData.link,
        status: postData.status
      }
    })

  } catch (error) {
    console.error('WordPress test error:', error)
    return NextResponse.json({
      error: 'WordPress接続テストに失敗',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}