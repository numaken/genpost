// app/api/rag/docs/route.ts - RAG document management
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import { storeDocument, seedDemoData } from '@/lib/embeddings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    if (process.env.PANO_RAG !== '1') {
      return NextResponse.json({ error: 'RAG機能が無効です' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'seed-demo') {
      // デモデータの挿入
      const siteId = body.siteId || 'demo-site'
      await seedDemoData(siteId)
      
      return NextResponse.json({ 
        success: true,
        message: 'デモデータを挿入しました',
        siteId 
      })
    }

    if (action === 'add-document') {
      const { siteId, title, url, content, kind } = body
      
      if (!siteId || !title || !content) {
        return NextResponse.json({ 
          error: 'siteId, title, contentは必須です' 
        }, { status: 400 })
      }

      const docId = await storeDocument(siteId, title, url || '', content, kind || 'page')
      
      return NextResponse.json({
        success: true,
        docId,
        message: 'ドキュメントを追加しました'
      })
    }

    return NextResponse.json({ 
      error: 'サポートされていないアクション' 
    }, { status: 400 })

  } catch (error: any) {
    console.error('RAG docs error:', error)
    
    return NextResponse.json({
      error: 'rag_docs_failed',
      message: error.message || 'ドキュメント操作に失敗しました'
    }, { status: 500 })
  }
}