// lib/naturalizeHeadings.ts - 見出し自然化（業種別マップ使用）

/**
 * 見出しを自然な表現に変換
 * @param text 変換対象のテキスト
 * @param headingMap 変換マップ
 * @returns 変換後のテキスト
 */
export function naturalizeHeadings(text: string, headingMap: Record<string, string>): string {
  let result = text
  
  // マップに基づいて変換
  Object.entries(headingMap).forEach(([original, natural]) => {
    // Markdown見出し（# ## ###）対応
    const mdRegex = new RegExp(`^(#{1,6})\\s*${escapeRegExp(original)}\\s*$`, 'gm')
    result = result.replace(mdRegex, `$1 ${natural}`)
    
    // HTML見出し（<h1> <h2> など）対応
    const htmlRegex = new RegExp(`(<h[1-6][^>]*>)\\s*${escapeRegExp(original)}\\s*(</h[1-6]>)`, 'gi')
    result = result.replace(htmlRegex, `$1${natural}$2`)
    
    // プレーンテキストでの見出し対応（行頭で単独）
    const plainRegex = new RegExp(`^${escapeRegExp(original)}\\s*$`, 'gm')
    result = result.replace(plainRegex, natural)
  })
  
  return result
}

/**
 * 正規表現用エスケープ
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 後方互換性のための型定義
export type HeadingMap = Record<string, string>;