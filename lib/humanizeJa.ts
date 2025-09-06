// lib/humanizeJa.ts - 人肌フィルタ（ルール＋ピンポイントLLM）

import { DEFAULT_VOICE_PROMPT } from './voicePrompt'

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

// 後方互換性のための旧humanizeJa関数
export const humanizeJa = ruleFilter

export { DEFAULT_VOICE_PROMPT }