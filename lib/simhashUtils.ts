// lib/simhashUtils.ts - SimHash重複チェック用ユーティリティ（DB連携）

import { createClient } from '@supabase/supabase-js'
import { simhash, hamming } from './simhash'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * 最近の記事のSimHashを取得（過去30日間）
 */
export async function loadRecentSimHashes(siteId: string): Promise<bigint[]> {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    // 仮想的なテーブル構造（実際の実装ではDBスキーマに合わせて調整）
    const { data, error } = await supabase
      .from('generated_articles') // テーブル名は実際の構造に合わせる
      .select('simhash')
      .eq('site_id', siteId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .not('simhash', 'is', null)
    
    if (error) {
      console.error('SimHash load error:', error)
      return []
    }
    
    return (data || []).map(row => BigInt(row.simhash)).filter(Boolean)
  } catch (error) {
    console.error('SimHash load error:', error)
    return []
  }
}

/**
 * 記事のSimHashを保存
 */
export async function saveArticleSimHash(
  siteId: string,
  articleId: string,
  content: string,
  title: string
): Promise<void> {
  try {
    const hash = simhash(content)
    
    // 仮想的なテーブル構造（実際の実装ではDBスキーマに合わせて調整）
    const { error } = await supabase
      .from('generated_articles')
      .upsert({
        id: articleId,
        site_id: siteId,
        title: title,
        content: content,
        simhash: hash.toString(),
        created_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('SimHash save error:', error)
    }
  } catch (error) {
    console.error('SimHash save error:', error)
  }
}

/**
 * 重複チェック
 */
export async function checkDuplicate(
  siteId: string,
  content: string,
  threshold: number = 6
): Promise<{ isDuplicate: boolean; similarity?: number }> {
  try {
    const newHash = simhash(content)
    const existingHashes = await loadRecentSimHashes(siteId)
    
    for (const existingHash of existingHashes) {
      const distance = hamming(newHash, existingHash)
      if (distance <= threshold) {
        return { 
          isDuplicate: true, 
          similarity: Math.round((1 - distance / 64) * 100) 
        }
      }
    }
    
    return { isDuplicate: false }
  } catch (error) {
    console.error('Duplicate check error:', error)
    return { isDuplicate: false }
  }
}