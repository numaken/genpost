// lib/critiqueAndRevise.ts - 二段生成システム（Draft → Critique → Revise）
import OpenAI from 'openai'

type MessageGenerator = (messages: any[]) => Promise<string>

/**
 * 二段生成：Draft → Critique → Revise
 * AIくささを削る本命の処理
 */
export async function critiqueAndRevise(
  gen: MessageGenerator,
  userPrompt: string,
  systemPrompt: string
): Promise<string> {
  // 1回目：素直に下書き
  const draft = await gen([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ])

  // 2回目：専用ルーブリックで問題点だけ列挙
  const rubric = `以下の観点で短く指摘（番号付き箇条書きで）:
1) 紋切り句・AIっぽい定型表現
2) 冗長な説明・繰り返し
3) 弱い見出し・インパクト不足
4) 曖昧表現・根拠の薄い主張
5) 不自然な語尾の連続

指摘のみ。修正案は不要。`

  const issues = await gen([
    { role: 'system', content: rubric },
    { role: 'user', content: `本文:\n${draft}\n---\n上記の問題点のみ番号付きで列挙してください` }
  ])

  // 3回目：列挙点のみ修正（局所リライト）
  const revised = await gen([
    { role: 'system', content: '列挙された箇所のみ最小限の修正。全体の内容や構成は変えない。自然な日本語に。' },
    { role: 'user', content: `本文:\n${draft}\n\n修正ポイント:\n${issues}\n---\n修正後の本文を返してください（修正箇所のみ変更）` }
  ])

  return revised
}

/**
 * OpenAI APIを使った生成関数のラッパー
 */
export function createGenerator(apiKey: string, model: string = 'gpt-3.5-turbo'): MessageGenerator {
  const openai = new OpenAI({ apiKey })
  
  return async (messages: any[]) => {
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4000
    })
    
    return response.choices[0]?.message?.content || ''
  }
}

/**
 * 批評結果を解析して修正の必要性を判定
 */
export function shouldRevise(issues: string): boolean {
  // 問題点が3つ以上指摘されている場合は修正必要
  const lines = issues.split('\n').filter(l => l.trim().match(/^\d+[.)]/))
  return lines.length >= 3
}

/**
 * 二段生成を選択的に適用（問題が少なければスキップ）
 */
export async function smartCritiqueAndRevise(
  gen: MessageGenerator,
  userPrompt: string,
  systemPrompt: string
): Promise<{ content: string; critiqued: boolean; issues?: string }> {
  // 1回目：下書き
  const draft = await gen([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ])

  // 2回目：批評
  const rubric = `以下の観点で問題点のみ指摘:
1) AIっぽい定型表現
2) 冗長・繰り返し
3) 弱い見出し
4) 根拠不足
番号付きで簡潔に。問題がなければ「問題なし」と回答。`

  const issues = await gen([
    { role: 'system', content: rubric },
    { role: 'user', content: `本文:\n${draft}\n---\n問題点を列挙` }
  ])

  // 問題が少なければそのまま返す
  if (issues.includes('問題なし') || !shouldRevise(issues)) {
    return { content: draft, critiqued: false }
  }

  // 3回目：修正
  const revised = await gen([
    { role: 'system', content: '指摘箇所のみ自然に修正' },
    { role: 'user', content: `本文:\n${draft}\n\n修正点:\n${issues}\n---\n修正版を出力` }
  ])

  return { content: revised, critiqued: true, issues }
}