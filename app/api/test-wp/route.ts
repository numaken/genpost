import { NextRequest, NextResponse } from 'next/server'

// WordPress診断機能
async function performWordPressDiagnostics(siteUrl: string) {
  const diagnostics: any = {
    siteAccessible: false,
    wpJsonExists: false,
    restApiEnabled: false,
    possibleIssues: [],
    solutions: [],
    detailedChecks: []
  }

  try {
    // 1. サイト自体にアクセス可能かチェック
    const siteCheck = await fetch(siteUrl, {
      headers: { 'User-Agent': 'genpost/1.0' }
    })
    diagnostics.siteAccessible = siteCheck.ok
    diagnostics.siteStatus = siteCheck.status
    diagnostics.detailedChecks.push({
      test: 'サイトアクセス',
      status: siteCheck.status,
      result: siteCheck.ok ? '✅ 成功' : '❌ 失敗'
    })

    // 2. /wp-json/ パスの存在確認（複数のエンドポイントをテスト）
    const wpJsonTests = [
      { path: '/wp-json/', name: 'wp-json ルートパス' },
      { path: '/wp-json/wp/v2', name: 'wp-json v2 API' },
      { path: '/wp-json/wp/v2/posts', name: 'Posts エンドポイント' }
    ]

    for (const test of wpJsonTests) {
      try {
        const response = await fetch(`${siteUrl}${test.path}`, {
          headers: { 
            'User-Agent': 'genpost/1.0',
            'Accept': 'application/json'
          }
        })
        
        diagnostics.detailedChecks.push({
          test: test.name,
          status: response.status,
          result: response.ok ? '✅ 成功' : `❌ 失敗 (${response.status})`
        })

        if (test.path === '/wp-json/') {
          diagnostics.wpJsonExists = response.ok
          diagnostics.wpJsonStatus = response.status
        }
      } catch (testError) {
        diagnostics.detailedChecks.push({
          test: test.name,
          status: 'ERROR',
          result: `❌ エラー: ${testError instanceof Error ? testError.message : String(testError)}`
        })
      }
    }

    // 3. 403エラーの具体的な原因を特定
    if (diagnostics.wpJsonStatus === 403) {
      diagnostics.possibleIssues.push('🔒 REST APIへのアクセスが403 Forbiddenで制限されています')
      
      // より具体的な診断を追加
      try {
        // XMLRPCの確認（よくREST APIと一緒に無効化される）
        const xmlrpcCheck = await fetch(`${siteUrl}/xmlrpc.php`, {
          method: 'POST',
          headers: { 'User-Agent': 'genpost/1.0' },
          body: '<?xml version="1.0"?><methodCall><methodName>system.listMethods</methodName></methodCall>'
        })
        diagnostics.detailedChecks.push({
          test: 'XML-RPC アクセス',
          status: xmlrpcCheck.status,
          result: xmlrpcCheck.ok ? '✅ 利用可能' : `❌ 制限あり (${xmlrpcCheck.status})`
        })
        
        if (xmlrpcCheck.status === 403) {
          diagnostics.possibleIssues.push('🔒 XML-RPCも403で制限されており、セキュリティプラグインが原因の可能性が高いです')
        }
      } catch (xmlrpcError) {
        diagnostics.detailedChecks.push({
          test: 'XML-RPC アクセス',
          status: 'ERROR',
          result: `❌ エラー: ${xmlrpcError instanceof Error ? xmlrpcError.message : String(xmlrpcError)}`
        })
      }

      // 具体的な解決策を提示
      diagnostics.solutions = [
        '🛡️ セキュリティプラグインの設定確認',
        '   - Wordfence: ファイアウォール設定でREST API許可',
        '   - iThemes Security: REST API制限の無効化',
        '   - All In One WP Security: REST API設定の確認',
        '',
        '⚙️ サーバー設定の確認',
        '   - .htaccess でのREST API制限を確認',
        '   - mod_security ルールの確認',
        '   - サーバーのIP制限やUser-Agent制限',
        '',
        '📝 WordPress設定の確認',
        '   - functions.php でのREST API無効化コードをチェック',
        '   - プラグインによるREST API制限の確認',
        '',
        '🔧 一時的な解決方法',
        '   - functions.php に以下を追加:',
        '     add_filter("rest_authentication_errors", function($result) {',
        '         if (!empty($result)) { return $result; }',
        '         return true;',
        '     });'
      ]
    } else if (!diagnostics.wpJsonExists) {
      diagnostics.possibleIssues.push('❌ WordPress REST APIが完全に無効化されています')
      diagnostics.solutions = [
        '📋 基本的な確認事項',
        '   - WordPressのバージョンが4.7以上であることを確認',
        '   - REST APIを無効化するプラグインがないか確認',
        '   - functions.php でREST APIが無効化されていないか確認'
      ]
    }

    // 4. 一般的なWordPressパスのチェック
    const wpAdminCheck = await fetch(`${siteUrl}/wp-admin/`, {
      headers: { 'User-Agent': 'genpost/1.0' },
      redirect: 'manual'
    })
    diagnostics.isWordPress = wpAdminCheck.status === 302 || wpAdminCheck.status === 200
    diagnostics.detailedChecks.push({
      test: 'WordPress確認',
      status: wpAdminCheck.status,
      result: diagnostics.isWordPress ? '✅ WordPress サイト確認' : '❓ WordPress不明'
    })

    // 5. 総合診断結果
    if (!diagnostics.siteAccessible) {
      diagnostics.possibleIssues.unshift('🌐 サイト自体にアクセスできません')
      diagnostics.solutions.unshift('💡 まず、ブラウザで直接サイトにアクセスできることを確認してください')
    }

  } catch (error) {
    diagnostics.error = error instanceof Error ? error.message : String(error)
    diagnostics.possibleIssues.push(`🔥 診断中にエラーが発生: ${diagnostics.error}`)
  }

  return diagnostics
}

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

    // まずREST APIの基本的な可用性をチェック
    let siteResponse
    try {
      siteResponse = await fetch(`${wpSiteUrl}/wp-json/wp/v2`, {
        headers: {
          'User-Agent': 'genpost/1.0',
          'Accept': 'application/json'
        }
      })
    } catch (fetchError) {
      return NextResponse.json({
        error: 'サイトへの接続に失敗しました',
        details: {
          message: 'ネットワークエラーまたはサイトが利用できません',
          fetchError: fetchError instanceof Error ? fetchError.message : String(fetchError)
        }
      }, { status: 400 })
    }

    // REST APIの状態を詳しく調査
    const responseText = await siteResponse.text()
    
    if (!siteResponse.ok) {
      // さらに詳細な診断を実行
      const diagnostics = await performWordPressDiagnostics(wpSiteUrl)
      
      return NextResponse.json({
        error: 'WordPress REST APIに接続できません',
        details: {
          status: siteResponse.status,
          statusText: siteResponse.statusText,
          url: `${wpSiteUrl}/wp-json/wp/v2`,
          response: responseText.substring(0, 500),
          diagnostics
        },
        diagnostics: diagnostics,
        troubleshooting: {
          detailedChecks: diagnostics.detailedChecks || [],
          possibleIssues: diagnostics.possibleIssues || [],
          solutions: diagnostics.solutions || []
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