// lib/jpPolish.ts - 日本語タイポグラフィの整形（読み心地向上）

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