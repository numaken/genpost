// lib/hybridHumanizeFilter.ts - ハイブリッド人肌フィルタ（ルール＋ピンポイントLLM）

import OpenAI from 'openai'

/**
 * ルールベースのフィルタ（高速・8割カバー）
 */
export function ruleFilter(text: string): string {
  const rules: [RegExp, string][] = [
    // 基本的なAIっぽい表現
    [/本記事では/g, '今日は'],
    [/について解説します/g, 'の話をしよう'],
    [/いかがでしたか？/g, 'どう思う？'],
    [/と言えるでしょう/g, 'って言える'],
    [/重要です/g, '大事'],
    [/していきます/g, 'します'],
    [/〜について説明します/g, '〜の話です'],
    [/ご紹介します/g, '紹介しよう'],
    [/確認してみてください/g, 'チェックしてみよう'],
    [/参考にしてください/g, '参考にしてね'],
    [/理解していただけたでしょうか/g, '分かったかな'],
    [/検討してみてください/g, '考えてみて'],
    [/活用してみてください/g, '使ってみよう'],
    
    // 過度に丁寧な表現
    [/させていただきます/g, 'します'],
    [/させていただく/g, 'する'],
    [/いたします/g, 'します'],
    [/おります/g, 'います'],
    
    // その他のAI特有表現
    [/まず第一に/g, 'まず'],
    [/次に/g, 'それから'],
    [/最後に/g, 'そして'],
    [/結論として/g, 'つまり'],
    [/要するに/g, 'つまり'],
    [/言い換えれば/g, 'つまり'],
  ]
  
  let result = text
  for (const [pattern, replacement] of rules) {
    result = result.replace(pattern, replacement)
  }
  
  // 同じ語尾の連続を自然にバラす
  result = result.replace(/です。です。です。/g, 'です。ですよ。ですね。')
  result = result.replace(/ます。ます。ます。/g, 'ます。ますね。ますよ。')
  result = result.replace(/でしょう。でしょう。/g, 'でしょう。だと思います。')
  result = result.replace(/ました。ました。/g, 'ました。ましたね。')
  
  return result
}

/**
 * 不自然な文を検出（長すぎる文・同語尾連続など）
 */
export function pickWeirdSentences(text: string): string[] {
  const sentences = text.split(/(?<=。)/)
  const weird: string[] = []
  
  sentences.forEach((sentence, i) => {
    // 60文字以上の長文
    if (sentence.length > 60) {
      weird.push(sentence)
      return
    }
    
    // 同じ語尾が3連続
    if (i >= 2) {
      const endings = [sentences[i-2], sentences[i-1], sentence]
        .map(s => s.slice(-3))
      if (endings[0] === endings[1] && endings[1] === endings[2]) {
        weird.push(sentence)
        return
      }
    }
    
    // カタカナ語の過剰使用（1文に4つ以上）
    const katakanaCount = (sentence.match(/[ァ-ヶー]+/g) || []).length
    if (katakanaCount >= 4) {
      weird.push(sentence)
      return
    }
    
    // 「こと」「もの」の過剰使用
    const kotoMonoCount = (sentence.match(/こと|もの/g) || []).length
    if (kotoMonoCount >= 3) {
      weird.push(sentence)
      return
    }
  })
  
  // 最大3文まで
  return weird.slice(0, 3)
}

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
 * 日本語タイポグラフィの整形（読み心地向上）
 */
export function jpPolish(text: string): string {
  let result = text
  
  // 三点リーダーの正規化
  result = result.replace(/\.{3,}/g, '…')
  result = result.replace(/。{3,}/g, '…')
  
  // ダッシュの正規化
  result = result.replace(/--+/g, '—')
  result = result.replace(/ー{3,}/g, '——')
  
  // 余分な空白の削除
  result = result.replace(/\s+/g, ' ')
  result = result.replace(/　+/g, '　')
  
  // 長文の後に短文を挿入（リズム付け）
  const sentences = result.split(/(?<=。)/)
  const polished: string[] = []
  
  sentences.forEach((sentence, i) => {
    polished.push(sentence)
    
    // 50文字以上の長文の後に短文を挿入
    if (sentence.length > 50 && i < sentences.length - 1) {
      // 次の文も長い場合のみ
      if (sentences[i + 1] && sentences[i + 1].length > 40) {
        polished.push('そう。')
      }
    }
  })
  
  return polished.join('')
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