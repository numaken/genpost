// app/api/admin/debug/route.ts - スーパーユーザー向けデバッグAPI
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import { isSuperUser, getSuperUserDebugInfo } from '@/lib/superuser'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    // スーパーユーザー権限チェック
    if (!isSuperUser(session.user.email)) {
      return NextResponse.json({ 
        error: 'admin_access_denied',
        message: 'スーパーユーザー権限が必要です'
      }, { status: 403 })
    }

    const debugInfo = getSuperUserDebugInfo()
    
    // 追加のシステム情報
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PANO_RAG: process.env.PANO_RAG,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '設定済み' : '未設定',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '設定済み' : '未設定'
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        email: session.user.email,
        name: session.user.name,
        superUser: true
      },
      debug: debugInfo,
      system: systemInfo,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Admin debug error:', error)
    
    return NextResponse.json({
      error: 'debug_failed',
      message: error.message || 'デバッグ情報取得に失敗しました'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    if (!isSuperUser(session.user.email)) {
      return NextResponse.json({ 
        error: 'admin_access_denied' 
      }, { status: 403 })
    }

    const body = await request.json()
    const { action, ...params } = body

    switch (action) {
      case 'test_rag':
        // RAG機能テスト
        try {
          const { searchContext } = await import('@/lib/embeddings')
          const results = await searchContext('test-site', 'panolabo AI', 3)
          return NextResponse.json({
            success: true,
            action: 'test_rag',
            results: results.length > 0 ? results : '結果なし（デモデータを登録してください）'
          })
        } catch (error: any) {
          return NextResponse.json({
            success: false,
            action: 'test_rag',
            error: error.message
          })
        }

      case 'test_telemetry':
        // テレメトリー機能テスト
        try {
          const { logEvent } = await import('@/lib/telemetry')
          await logEvent('generation.start', {
            userId: session.user.id || 'admin-test',
            topic: 'admin-debug-test',
            metadata: { source: 'admin_debug_api' }
          })
          return NextResponse.json({
            success: true,
            action: 'test_telemetry',
            message: 'テレメトリーイベントを記録しました'
          })
        } catch (error: any) {
          return NextResponse.json({
            success: false,
            action: 'test_telemetry',
            error: error.message
          })
        }

      case 'seed_demo_data':
        // デモデータ作成
        try {
          const { seedDemoData } = await import('@/lib/embeddings')
          await seedDemoData('admin-demo-site')
          return NextResponse.json({
            success: true,
            action: 'seed_demo_data',
            message: 'デモデータを作成しました'
          })
        } catch (error: any) {
          return NextResponse.json({
            success: false,
            action: 'seed_demo_data', 
            error: error.message
          })
        }

      default:
        return NextResponse.json({
          error: 'invalid_action',
          availableActions: ['test_rag', 'test_telemetry', 'seed_demo_data']
        }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Admin debug action error:', error)
    
    return NextResponse.json({
      error: 'action_failed',
      message: error.message || 'アクション実行に失敗しました'
    }, { status: 500 })
  }
}