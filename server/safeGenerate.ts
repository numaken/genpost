// server/safeGenerate.ts - Safe generation with fallback
import { logEvent, withRetry, pushToDLQ, type EventPayload } from '@/lib/telemetry'
import { createGenerator } from '@/lib/critiqueAndRevise'

export interface GenerationContext {
  userId: string
  siteId?: string
  topic: string
  keywords: string
  model: string
  apiKey: string
  ragContext?: string
  useCritique?: boolean
}

export interface GenerationResult {
  content: string
  mode: 'normal' | 'short' | 'backup'
  msElapsed: number
  critiqued: boolean
  ragUsed: boolean
}

/**
 * 段階的フォールバック付き安全生成
 * 1. 通常生成（2回リトライ）
 * 2. 短縮プロンプト生成（1回リトライ）  
 * 3. バックアップモデル生成（1回リトライ）
 * 4. DLQに記録
 */
export async function safeGenerate(context: GenerationContext): Promise<GenerationResult> {
  const startTime = Date.now()
  
  // 開始ログ
  await logEvent('generation.start', {
    userId: context.userId,
    siteId: context.siteId,
    topic: context.topic,
    model: context.model
  })

  try {
    // Phase 1: 通常生成（2回リトライ）
    try {
      const result = await withRetry(
        () => runNormalGeneration(context),
        2,
        500
      )
      
      const elapsed = Date.now() - startTime
      
      await logEvent('generation.success', {
        userId: context.userId,
        siteId: context.siteId,
        topic: context.topic,
        model: context.model,
        mode: 'normal',
        bytesGenerated: result.content.length,
        msElapsed: elapsed,
        ragCards: context.ragContext ? 1 : 0,
        critiqued: result.critiqued
      })

      return {
        ...result,
        mode: 'normal',
        msElapsed: elapsed,
        ragUsed: !!context.ragContext
      }
    } catch (normalError) {
      console.log('Normal generation failed, trying short mode:', normalError)
    }

    // Phase 2: 短縮プロンプト生成（1回リトライ）
    try {
      const result = await withRetry(
        () => runShortGeneration(context),
        1,
        300
      )
      
      const elapsed = Date.now() - startTime
      
      await logEvent('generation.success', {
        userId: context.userId,
        siteId: context.siteId,
        topic: context.topic,
        model: context.model,
        mode: 'short',
        bytesGenerated: result.content.length,
        msElapsed: elapsed,
        ragCards: context.ragContext ? 1 : 0,
        critiqued: false // 短縮モードでは critique なし
      })

      return {
        ...result,
        mode: 'short',
        msElapsed: elapsed,
        ragUsed: !!context.ragContext
      }
    } catch (shortError) {
      console.log('Short generation failed, trying backup model:', shortError)
    }

    // Phase 3: バックアップモデル生成（1回リトライ）
    try {
      const result = await withRetry(
        () => runBackupGeneration(context),
        1,
        300
      )
      
      const elapsed = Date.now() - startTime
      
      await logEvent('generation.success', {
        userId: context.userId,
        siteId: context.siteId,
        topic: context.topic,
        model: 'gpt-3.5-turbo', // バックアップモデル
        mode: 'backup',
        bytesGenerated: result.content.length,
        msElapsed: elapsed,
        ragCards: context.ragContext ? 1 : 0,
        critiqued: false
      })

      return {
        ...result,
        mode: 'backup',
        msElapsed: elapsed,
        ragUsed: !!context.ragContext
      }
    } catch (backupError) {
      console.error('All generation attempts failed:', backupError)
      
      // Phase 4: DLQに記録
      await pushToDLQ({
        userId: context.userId,
        siteId: context.siteId,
        topic: context.topic,
        errorContext: {
          originalModel: context.model,
          keywords: context.keywords,
          ragContextLength: context.ragContext?.length || 0,
          finalError: backupError instanceof Error ? backupError.message : String(backupError)
        },
        attempts: 4 // 2 + 1 + 1
      })

      const elapsed = Date.now() - startTime
      
      await logEvent('generation.fail', {
        userId: context.userId,
        siteId: context.siteId,
        topic: context.topic,
        model: context.model,
        msElapsed: elapsed,
        errorMessage: backupError instanceof Error ? backupError.message : String(backupError)
      })

      throw new Error(`記事生成に失敗しました。すべてのフォールバックを試行しましたが成功しませんでした。`)
    }

  } catch (error) {
    // 予期しないエラー
    const elapsed = Date.now() - startTime
    
    await logEvent('generation.fail', {
      userId: context.userId,
      siteId: context.siteId,
      topic: context.topic,
      model: context.model,
      msElapsed: elapsed,
      errorMessage: error instanceof Error ? error.message : String(error)
    })

    throw error
  }
}

/**
 * 通常生成（フル機能）
 */
async function runNormalGeneration(context: GenerationContext) {
  const { createGenerator, smartCritiqueAndRevise } = await import('@/lib/critiqueAndRevise')
  const generator = createGenerator(context.apiKey, context.model)

  const systemPrompt = buildSystemPrompt(context, 'full')
  const userPrompt = buildUserPrompt(context, 'full')

  if (context.useCritique) {
    const result = await smartCritiqueAndRevise(generator, userPrompt, systemPrompt)
    return {
      content: result.content,
      critiqued: result.critiqued
    }
  } else {
    const content = await generator([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ])
    return {
      content,
      critiqued: false
    }
  }
}

/**
 * 短縮生成（シンプルプロンプト）
 */
async function runShortGeneration(context: GenerationContext) {
  const { createGenerator } = await import('@/lib/critiqueAndRevise')
  const generator = createGenerator(context.apiKey, context.model)

  const systemPrompt = buildSystemPrompt(context, 'short')
  const userPrompt = buildUserPrompt(context, 'short')

  const content = await generator([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ])

  return {
    content,
    critiqued: false
  }
}

/**
 * バックアップモデル生成
 */
async function runBackupGeneration(context: GenerationContext) {
  const { createGenerator } = await import('@/lib/critiqueAndRevise')
  const generator = createGenerator(context.apiKey, 'gpt-3.5-turbo') // 固定でバックアップモデル

  const systemPrompt = buildSystemPrompt(context, 'backup')
  const userPrompt = buildUserPrompt(context, 'backup')

  const content = await generator([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ])

  return {
    content,
    critiqued: false
  }
}

/**
 * モードに応じたシステムプロンプト構築
 */
function buildSystemPrompt(context: GenerationContext, mode: 'full' | 'short' | 'backup'): string {
  const { DEFAULT_VOICE_PROMPT } = require('@/lib/voicePrompt')
  
  let basePrompt = `${DEFAULT_VOICE_PROMPT}\n\nあなたはpanolabo AIエンジンです。`
  
  if (mode === 'full') {
    basePrompt += `
8つの要素を自動で最適化し、高品質なブログ記事を生成します：
1. ターゲット読者（Who）- キーワードから最適な読者層を判定
2. 問題・課題（What）- 読者の抱える課題を特定  
3. 解決策・提案（How）- 具体的な解決方法を提示
4. 根拠・証拠（Why）- 信頼できる理由と根拠を提供
5. ベネフィット（Benefit）- 読者が得られる明確な利益
6. 感情的フック（Emotion）- 読者の心を掴む表現
7. 行動喚起（Call-to-Action）- 具体的な次のアクション
8. SEOキーワード配置（SEO）- 自然なキーワード配置`
  } else if (mode === 'short') {
    basePrompt += ` 簡潔で読みやすいブログ記事を生成してください。`
  } else {
    basePrompt += ` 基本的なブログ記事を生成してください。`
  }

  // RAGコンテキスト追加
  if (context.ragContext) {
    basePrompt += `\n\n# 参照可能な事実\n${context.ragContext}\n\n上記の情報を適切に引用・参考にしてください。`
  }

  return basePrompt
}

/**
 * モードに応じたユーザープロンプト構築
 */
function buildUserPrompt(context: GenerationContext, mode: 'full' | 'short' | 'backup'): string {
  let prompt = `キーワード: ${context.keywords}\n\n`
  
  if (mode === 'full') {
    prompt += `上記キーワードから8つの要素を自動最適化し、専門性の高いブログ記事を生成してください。

要件:
- 読者にとって価値のある実用的な内容
- 具体的な事例や数字を含める  
- 読みやすい見出し構成
- 最後に具体的な行動喚起を含める
- キーワードを自然に配置（SEO対応）`
  } else if (mode === 'short') {
    prompt += `上記キーワードに関する実用的な記事を800文字程度で作成してください。見出しと具体例を含めてください。`
  } else {
    prompt += `上記キーワードについて、基本的な説明記事を500文字程度で作成してください。`
  }

  return prompt
}