// lib/critiqueAndRevise.ts - 二段生成: Draft → Critique → Revise

import OpenAI from 'openai'

type Msg = { role: 'system' | 'user' | 'assistant'; content: string }
export type GenFn = (msgs: Msg[]) => Promise<string>

/**
 * OpenAI生成関数を作成
 */
export function createGenerator(apiKey: string, model: string = 'gpt-3.5-turbo'): GenFn {
  const openai = new OpenAI({ apiKey })
  
  return async (msgs: Msg[]): Promise<string> => {
    const response = await openai.chat.completions.create({
      model,
      messages: msgs,
      temperature: 0.4,
      max_tokens: 4000
    })
    
    return response.choices[0]?.message?.content || ''
  }
}

/**
 * 二段生成: Draft → Critique → Revise（最小修正）
 */
export async function critiqueAndRevise(gen: GenFn, systemVoice: string, userPrompt: string) {
  const draft = await gen([
    { role: 'system', content: systemVoice },
    { role: 'user', content: userPrompt }
  ])

  const rubric = `以下の観点で短く指摘: 1) 紋切り句 2) 冗長 3) 見出しの弱さ 4) 曖昧表現。本文を書き換えず、箇条書きで具体箇所だけ列挙。`
  const issues = await gen([
    { role: 'system', content: rubric },
    { role: 'user', content: `本文:\n${draft}\n---\n上記の問題点のみ番号付きで列挙` }
  ])

  const revised = await gen([
    { role: 'system', content: '列挙の箇所のみ最小修正。意味や事実を変えない。' },
    { role: 'user', content: `本文:\n${draft}\n修正ポイント:\n${issues}\n---\n修正後本文だけを返して` }
  ])

  return revised
}

/**
 * スマート批評・修正（問題が少ない場合はスキップ）
 */
export async function smartCritiqueAndRevise(
  gen: GenFn,
  userPrompt: string,
  systemPrompt: string
): Promise<{ content: string; critiqued: boolean; issues?: string }> {
  // まず下書きを生成
  const draft = await gen([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ])

  // 批評システム
  const rubric = `以下の観点で問題点を短く指摘:
1) 紋切り句・定型文（「本記事では」「解説します」等）
2) 冗長表現・重複
3) 見出しの弱さ（読者の興味を引かない）
4) 曖昧で具体性に欠ける表現

問題が3個以下なら「問題なし」、それ以上なら具体箇所を番号付きで列挙。`

  const issues = await gen([
    { role: 'system', content: rubric },
    { role: 'user', content: `本文:\n${draft}\n---\n上記の観点で評価して` }
  ])

  // 問題が少ない場合はそのまま返す
  if (issues.includes('問題なし') || issues.split('\n').filter(l => l.trim().match(/^\d+/)).length <= 2) {
    return { content: draft, critiqued: false }
  }

  // 問題がある場合は修正
  const revised = await gen([
    { role: 'system', content: '指摘された箇所のみ最小修正。意味や事実は変えない。自然で読みやすい文章に。' },
    { role: 'user', content: `本文:\n${draft}\n修正ポイント:\n${issues}\n---\n修正後の本文のみ返して` }
  ])

  return { content: revised, critiqued: true, issues }
}