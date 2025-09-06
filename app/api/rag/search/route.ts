// app/api/rag/search/route.ts - RAG検索API
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import { searchContext } from '@/lib/embeddings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // RAG機能が有効化されているかチェック
    if (process.env.PANO_RAG !== '1') {
      return NextResponse.json({ 
        error: 'RAG機能が無効です',
        items: [] 
      }, { status: 400 })
    }

    // セッション確認
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { siteId, query, topK = 5 } = body

    // 必須パラメータチェック
    if (!siteId || !query?.trim()) {
      return NextResponse.json({ 
        error: 'siteIdとqueryは必須です',
        items: [] 
      }, { status: 400 })
    }

    // コンテキスト検索実行
    const items = await searchContext(siteId, query.trim(), topK)

    return NextResponse.json({ 
      success: true,
      items,
      query: query.trim(),
      siteId,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('RAG search error:', error)
    
    return NextResponse.json({
      error: 'rag_search_failed',
      message: error.message || 'コンテキスト検索に失敗しました',
      items: [],
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack
      } : undefined
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // デバッグ用エンドポイント（開発環境のみ）
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const siteId = searchParams.get('siteId') || 'demo-site'
  const query = searchParams.get('query') || 'panolabo AI'

  try {
    const items = await searchContext(siteId, query, 5)
    
    return NextResponse.json({
      items,
      query,
      siteId,
      debug: true
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      items: []
    }, { status: 500 })
  }
}