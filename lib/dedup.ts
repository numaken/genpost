import 'server-only'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small'
const SIM_THRESHOLD = Number(process.env.SIM_THRESHOLD || 0.87)

/**
 * OpenAI Embeddings APIでテキストをベクトル化
 */
export async function computeEmbedding(text: string): Promise<number[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000) // 8K文字制限
  })
  return response.data[0].embedding as unknown as number[]
}

/**
 * コサイン類似度計算
 */
export function cosine(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1)
}

/**
 * ユーザーの最近のembeddingを取得
 */
export async function fetchRecentEmbeddings(userId: string, limit = 200) {
  const { data, error } = await supabase
    .from('article_embeddings')
    .select('id, key, vector')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data || []
}

/**
 * 記事の重複チェック（語句+意味類似）
 */
export async function isDuplicate(
  userId: string, 
  title: string, 
  primaryKeyword: string
): Promise<{ dup: boolean; reason?: string; sim?: number }> {
  const candidateKey = `${title} | ${primaryKeyword || ''}`
  
  // 1) 語句レベル: タイトル完全一致チェック
  const { data: articles } = await supabase
    .from('articles')
    .select('title, slug')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200)
  
  if (articles?.some(a => a.title === title)) {
    return { dup: true, reason: 'lexical' }
  }
  
  // 2) 意味レベル: embedding cosine similarity
  const recent = await fetchRecentEmbeddings(userId, 200)
  if (recent.length === 0) {
    return { dup: false, sim: 0 }
  }
  
  const candidateEmbedding = await computeEmbedding(candidateKey)
  let maxSimilarity = 0
  
  for (const record of recent) {
    const vector = (record.vector as unknown as number[]) || []
    const similarity = cosine(candidateEmbedding, vector)
    
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity
    }
    
    if (similarity >= SIM_THRESHOLD) {
      return { dup: true, reason: 'semantic', sim: similarity }
    }
  }
  
  return { dup: false, sim: maxSimilarity }
}

/**
 * 記事embeddingの保存
 */
export async function saveEmbedding(
  userId: string, 
  articleId: string, 
  title: string, 
  primaryKeyword: string
): Promise<void> {
  const key = `${title} | ${primaryKeyword || ''}`
  const vector = await computeEmbedding(key)
  
  const { error } = await supabase
    .from('article_embeddings')
    .insert({
      user_id: userId,
      article_id: articleId,
      key,
      vector: vector as unknown as any // JSONBとして保存
    })
  
  if (error) throw error
}

/**
 * スラッグ生成（簡易版）
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // 特殊文字除去
    .replace(/[\s_-]+/g, '-') // スペース・アンダースコア・ハイフンを統一
    .replace(/^-+|-+$/g, '')  // 先頭末尾のハイフン除去
}