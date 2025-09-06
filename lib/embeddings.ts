// lib/embeddings.ts - OpenAI Embeddings integration
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function createEmbedding(text: string): Promise<number[]> {
  try {
    // 既存のAPIキー取得ロジックを使用
    const { getEffectiveApiKey } = await import('./api-keys')
    const apiKey = await getEffectiveApiKey('system') // システム用APIキー
    
    if (!apiKey) {
      throw new Error('No API key available for embeddings')
    }

    const openai = new OpenAI({ apiKey })
    
    const response = await openai.embeddings.create({
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      input: text.slice(0, 8000), // トークン制限
    })

    return response.data[0].embedding
  } catch (error) {
    console.error('Embedding creation failed:', error)
    throw new Error(`Embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function storeDocument(
  siteId: string, 
  title: string, 
  url: string, 
  content: string, 
  kind: string = 'page'
): Promise<number> {
  try {
    // ドキュメント挿入
    const { data: doc, error: docError } = await supabase
      .from('rag_docs')
      .insert({
        site_id: siteId,
        title,
        url,
        kind,
        content,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (docError) throw docError

    // エンベディング生成・保存
    const embedding = await createEmbedding(content)
    
    const { error: embError } = await supabase
      .from('rag_embeddings')
      .insert({
        doc_id: doc.id,
        embedding: `[${embedding.join(',')}]` // PostgreSQL array format
      })

    if (embError) throw embError

    return doc.id
  } catch (error) {
    console.error('Document storage failed:', error)
    throw error
  }
}

export interface ContextCard {
  id: number
  title: string
  url: string
  kind: string
  snippet: string
  score: number
}

export async function searchContext(
  siteId: string, 
  query: string, 
  topK: number = 5
): Promise<ContextCard[]> {
  try {
    const queryEmbedding = await createEmbedding(query)
    
    // pgvectorがない場合の代替：シンプルなマッチング
    // 本格運用時はpgvectorでコサイン類似度検索
    const { data: docs, error } = await supabase
      .from('rag_docs')
      .select('id, title, url, kind, content')
      .eq('site_id', siteId)
      .limit(20) // 候補を絞る
    
    if (error) throw error

    // 簡易的なキーワードマッチング（pgvectorがない場合の代替）
    const keywords = query.toLowerCase().split(/\s+/)
    const results = docs.map(doc => {
      const content = doc.content.toLowerCase()
      let score = 0
      
      // キーワードマッチングスコア
      keywords.forEach(keyword => {
        const matches = (content.match(new RegExp(keyword, 'g')) || []).length
        score += matches * 0.1
      })
      
      // タイトルマッチにはボーナス
      keywords.forEach(keyword => {
        if (doc.title.toLowerCase().includes(keyword)) {
          score += 0.5
        }
      })

      return {
        id: doc.id,
        title: doc.title,
        url: doc.url,
        kind: doc.kind,
        snippet: doc.content.slice(0, 400),
        score: Math.min(score, 1.0) // 0-1に正規化
      }
    })

    // スコア順でソート
    results.sort((a, b) => b.score - a.score)
    
    return results.slice(0, topK).filter(r => r.score > 0.1)
  } catch (error) {
    console.error('Context search failed:', error)
    return []
  }
}

// デモ用データ挿入関数
export async function seedDemoData(siteId: string) {
  if (process.env.NODE_ENV !== 'development') return

  const demoContent = [
    {
      title: 'panolabo AI Engine v2.1の特徴',
      url: 'https://example.com/engine-features',
      content: 'panolabo AI Engine v2.1は、二段生成（Draft→Critique→Revise）により、AIっぽさを大幅に削減します。業種別の見出し自然化機能により、「What/How/Why」から読者の言葉への変換を自動化。人肌フィルタで紋切り表現を除去し、より自然な文章を生成します。',
      kind: 'feature'
    },
    {
      title: '記事生成の品質向上テクニック',
      url: 'https://example.com/quality-tips',
      content: '高品質な記事を生成するには、具体的なキーワード指定、ターゲット読者の明確化、参考情報の事前準備が重要です。panolabo AI Engineは、これらの要素を自動で最適化し、SEO効果の高い記事を生成できます。',
      kind: 'tips'
    },
    {
      title: 'WordPress自動投稿の設定方法',
      url: 'https://example.com/wp-setup',
      content: 'GenPostをWordPressに接続するには、Application PasswordまたはREST APIキーが必要です。設定完了後は、下書き・公開・予約投稿を自動化できます。カテゴリー指定、メタデータの自動付与も可能です。',
      kind: 'setup'
    }
  ]

  for (const item of demoContent) {
    try {
      await storeDocument(siteId, item.title, item.url, item.content, item.kind)
      console.log(`Demo data inserted: ${item.title}`)
    } catch (error) {
      console.error(`Failed to insert demo data: ${item.title}`, error)
    }
  }
}