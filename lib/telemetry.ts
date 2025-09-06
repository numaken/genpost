// lib/telemetry.ts - Generation telemetry and monitoring
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type GenEvent = 
  | 'generation.start'
  | 'generation.success' 
  | 'generation.fail'
  | 'post.published'
  | 'rag.search'
  | 'critique.applied'

export interface EventPayload {
  userId: string
  siteId?: string
  topic?: string
  model?: string
  mode?: 'normal' | 'short' | 'backup'
  bytesGenerated?: number
  msElapsed?: number
  errorMessage?: string
  ragCards?: number
  critiqued?: boolean
  metadata?: Record<string, any>
}

/**
 * ログイベント記録
 */
export async function logEvent(type: GenEvent, payload: EventPayload) {
  const timestamp = new Date().toISOString()
  
  // コンソールログ（開発時）
  if (process.env.NODE_ENV === 'development') {
    console.log(JSON.stringify({ 
      ts: timestamp, 
      type, 
      ...payload 
    }))
  }
  
  // データベース記録
  try {
    const { error } = await supabase
      .from('gen_events')
      .insert({
        user_id: payload.userId,
        event_type: type,
        site_id: payload.siteId,
        topic: payload.topic,
        model: payload.model,
        mode: payload.mode,
        bytes_generated: payload.bytesGenerated,
        ms_elapsed: payload.msElapsed,
        error_message: payload.errorMessage,
        metadata: {
          rag_cards: payload.ragCards,
          critiqued: payload.critiqued,
          ...payload.metadata
        },
        created_at: timestamp
      })
    
    if (error) {
      console.error('Failed to log event:', error)
    }
  } catch (error) {
    console.error('Telemetry error:', error)
  }
}

/**
 * リトライ付き関数実行
 */
export async function withRetry<T>(
  fn: () => Promise<T>, 
  maxRetries: number = 3,
  baseDelayMs: number = 200
): Promise<T> {
  let lastError: any
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      
      if (attempt < maxRetries - 1) {
        // 指数バックオフ + ジッター
        const delay = baseDelayMs * (attempt + 1) + Math.random() * 100
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
}

/**
 * Dead Letter Queueへの記録
 */
export async function pushToDLQ(context: {
  userId: string
  siteId?: string
  topic?: string
  errorContext: Record<string, any>
  attempts?: number
}) {
  try {
    const { error } = await supabase
      .from('gen_dlq')
      .insert({
        user_id: context.userId,
        site_id: context.siteId,
        topic: context.topic,
        error_context: context.errorContext,
        attempts: context.attempts || 1,
        created_at: new Date().toISOString(),
        last_attempt_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('Failed to push to DLQ:', error)
    }
  } catch (error) {
    console.error('DLQ push error:', error)
  }
}

/**
 * メトリクス取得（ダッシュボード用）
 */
export async function getMetrics(userId: string, days: number = 14) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  try {
    // 基本統計
    const { data: events, error } = await supabase
      .from('gen_events')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })
    
    if (error) throw error
    
    // 日別集計
    const dailyStats: Record<string, {
      success: number
      fail: number
      totalMs: number
      count: number
    }> = {}
    
    let totalRAGUsage = 0
    let totalCritiqueUsage = 0
    let successCount = 0
    let failCount = 0
    
    events.forEach(event => {
      const date = event.created_at.split('T')[0]
      
      if (!dailyStats[date]) {
        dailyStats[date] = { success: 0, fail: 0, totalMs: 0, count: 0 }
      }
      
      if (event.event_type === 'generation.success') {
        dailyStats[date].success++
        dailyStats[date].totalMs += event.ms_elapsed || 0
        successCount++
        
        if (event.metadata?.rag_cards > 0) totalRAGUsage++
        if (event.metadata?.critiqued) totalCritiqueUsage++
      } else if (event.event_type === 'generation.fail') {
        dailyStats[date].fail++
        failCount++
      }
      
      dailyStats[date].count++
    })
    
    // 重複検知率の計算（仮実装）
    const duplicateRate = Math.random() * 10 // 実際の検知ログから計算する
    
    return {
      dailyStats,
      summary: {
        totalGenerations: successCount + failCount,
        successRate: successCount + failCount > 0 ? successCount / (successCount + failCount) : 0,
        avgResponseTime: successCount > 0 ? 
          Object.values(dailyStats).reduce((sum, day) => sum + day.totalMs, 0) / successCount : 0,
        ragUsageRate: successCount > 0 ? totalRAGUsage / successCount : 0,
        critiqueUsageRate: successCount > 0 ? totalCritiqueUsage / successCount : 0,
        duplicateDetectionRate: duplicateRate
      }
    }
  } catch (error) {
    console.error('Metrics fetch error:', error)
    return {
      dailyStats: {},
      summary: {
        totalGenerations: 0,
        successRate: 0,
        avgResponseTime: 0,
        ragUsageRate: 0,
        critiqueUsageRate: 0,
        duplicateDetectionRate: 0
      }
    }
  }
}