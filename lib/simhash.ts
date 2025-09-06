// lib/simhash.ts - SimHash重複チェック

/**
 * テキストのSimHashを計算
 */
export function simhash(text: string): bigint {
  const features = extractFeatures(text)
  const vector = new Array(64).fill(0)
  
  features.forEach((weight, feature) => {
    const hash = hashString(feature)
    for (let i = 0; i < 64; i++) {
      if ((hash & (BigInt(1) << BigInt(i))) !== BigInt(0)) {
        vector[i] += weight
      } else {
        vector[i] -= weight
      }
    }
  })
  
  let fingerprint = BigInt(0)
  for (let i = 0; i < 64; i++) {
    if (vector[i] > 0) {
      fingerprint |= (BigInt(1) << BigInt(i))
    }
  }
  
  return fingerprint
}

/**
 * ハミング距離を計算
 */
export function hamming(a: bigint, b: bigint): number {
  let xor = a ^ b
  let distance = 0
  
  while (xor !== BigInt(0)) {
    distance += Number(xor & BigInt(1))
    xor >>= BigInt(1)
  }
  
  return distance
}

/**
 * テキストから特徴量を抽出（N-gram + 単語）
 */
function extractFeatures(text: string): Map<string, number> {
  const features = new Map<string, number>()
  
  // 正規化
  const normalized = text
    .replace(/\s+/g, '')
    .replace(/[。、！？]/g, '')
    .toLowerCase()
  
  // 2-gram
  for (let i = 0; i < normalized.length - 1; i++) {
    const bigram = normalized.slice(i, i + 2)
    features.set(`2g_${bigram}`, (features.get(`2g_${bigram}`) || 0) + 1)
  }
  
  // 3-gram
  for (let i = 0; i < normalized.length - 2; i++) {
    const trigram = normalized.slice(i, i + 3)
    features.set(`3g_${trigram}`, (features.get(`3g_${trigram}`) || 0) + 2) // 重み付け
  }
  
  // 単語レベル（簡易）
  const words = text.match(/[ァ-ヶー]+|[一-龯]+|[a-zA-Z]+/g) || []
  words.forEach(word => {
    if (word.length >= 2) {
      features.set(`word_${word}`, (features.get(`word_${word}`) || 0) + 3) // さらに重み付け
    }
  })
  
  return features
}

/**
 * 文字列のハッシュ値を計算（簡易版）
 */
function hashString(str: string): bigint {
  let hash = BigInt(0)
  for (let i = 0; i < str.length; i++) {
    const char = BigInt(str.charCodeAt(i))
    hash = ((hash << BigInt(5)) - hash) + char
    hash = hash & ((BigInt(1) << BigInt(64)) - BigInt(1)) // 64bit制限
  }
  return hash
}