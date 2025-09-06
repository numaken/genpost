// lib/fullHumanize.ts - ハイブリッド人肌フィルタ（ルール＋ピンポイントLLM）

import OpenAI from 'openai'
import { ruleFilter, pickWeirdSentences } from './humanizeJa'
import { jpPolish } from './jpPolish'

/**
 * LLMで不自然な文を自然に言い換え
 */
export async function llmRephrase(
  sentences: string[],
  apiKey: string,
  model: string = 'gpt-3.5-turbo'
): Promise<Map<string, string>> {
  if (sentences.length === 0) {
    return new Map()
  }
  
  const openai = new OpenAI({ apiKey })
  const replacements = new Map<string, string>()
  
  for (const sentence of sentences) {
    try {
      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: '以下の文を、内容は変えずに自然な日本語に言い換えてください。簡潔に。'
          },
          {
            role: 'user',
            content: sentence
          }
        ],
        temperature: 0.5,
        max_tokens: 150
      })
      
      const rephrased = response.choices[0]?.message?.content?.trim()
      if (rephrased && rephrased !== sentence) {
        replacements.set(sentence, rephrased)
      }
    } catch (error) {
      console.error('LLM rephrase error:', error)
    }
  }
  
  return replacements
}

/**
 * ハイブリッド人肌フィルタのメイン関数
 */
export async function hybridHumanize(
  text: string,
  apiKey?: string,
  useLLM: boolean = true
): Promise<string> {
  // Step 1: ルールベースフィルタで8割処理
  let result = ruleFilter(text)
  
  // Step 2: LLMが利用可能なら残りの不自然文を処理
  if (useLLM && apiKey) {
    const weirdSentences = pickWeirdSentences(result)
    
    if (weirdSentences.length > 0) {
      const replacements = await llmRephrase(weirdSentences, apiKey)
      
      // 置換を適用
      replacements.forEach((replacement, original) => {
        result = result.replace(original, replacement)
      })
    }
  }
  
  return result
}

/**
 * 完全版：ハイブリッドフィルタ＋タイポグラフィ整形
 */
export async function fullHumanize(
  text: string,
  apiKey?: string,
  options: {
    useLLM?: boolean
    polish?: boolean
  } = {}
): Promise<string> {
  const { useLLM = true, polish = true } = options
  
  // ハイブリッド人肌フィルタ
  let result = await hybridHumanize(text, apiKey, useLLM)
  
  // タイポグラフィ整形
  if (polish) {
    result = jpPolish(result)
  }
  
  return result
}