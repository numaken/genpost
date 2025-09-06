// lib/headingMapsByVertical.ts - 業種別見出し自然化マップ

export type HeadingMap = Record<string, string>
export type VerticalMaps = Record<string, HeadingMap>

/**
 * 業種別の見出し変換マップ
 * カテゴリ/タクソノミで切替して使用
 */
export const headingMapByVertical: VerticalMaps = {
  // 共通（デフォルト）
  common: {
    // 基本フレームワーク
    '読者の抱える課題': 'こんな悩み、ありませんか？',
    '解決策と提案': 'アプリでやることはこの3つ',
    '根拠と証拠': '数字でわかる効果',
    'ベネフィット': '導入すると、ここが変わる',
    '感情的フック': 'お客様が"通いたくなる理由"をつくる',
    '行動喚起': 'まずはここから',
    'まとめ': '最後にひとこと',
    
    // panolabo AI エンジンの8要素
    'ターゲット読者': 'こんな方におすすめ',
    '問題・課題': 'よくあるお悩み',
    '解決策・提案': '解決のポイント',
    '根拠・証拠': 'なぜ効果的なのか',
    'SEOキーワード配置': 'キーポイント',
  },

  // 飲食店向け
  restaurant: {
    '解決策と提案': '来店を増やす3つの打ち手',
    '根拠と証拠': '数字で見る手応え',
    'ベネフィット': 'お店に起きる変化',
    '行動喚起': '今すぐ予約・来店を',
    'ターゲット読者': 'こんなお客様を歓迎',
    '問題・課題': '飲食店あるある悩み',
  },

  // カフェ向け
  cafe: {
    '解決策と提案': '常連さんを増やす工夫',
    '根拠と証拠': '実際の効果をデータで',
    'ベネフィット': 'カフェの雰囲気が変わる',
    '行動喚起': 'まずは一杯から',
    '感情的フック': 'ほっとする空間づくり',
  },

  // 美容室・サロン向け
  beauty: {
    '解決策と提案': 'リピート率を上げる3つの方法',
    '根拠と証拠': 'サロンの実績データ',
    'ベネフィット': 'お客様との関係が深まる',
    '行動喚起': '次回予約はこちら',
    '感情的フック': 'キレイになる喜びを共に',
    'ターゲット読者': 'こんな方にぴったり',
  },

  // 小売店向け
  retail: {
    '解決策と提案': '売上アップの3つの施策',
    '根拠と証拠': '販売データが証明',
    'ベネフィット': 'お店が活気づく',
    '行動喚起': '今すぐチェック',
    '問題・課題': '小売店の共通課題',
  },

  // フィットネス・ジム向け
  fitness: {
    '解決策と提案': '継続率を高める仕組み',
    '根拠と証拠': 'トレーニング効果の実証',
    'ベネフィット': '理想の体に近づく',
    '行動喚起': '無料体験から始めよう',
    '感情的フック': '達成感を味わえる',
    'ターゲット読者': 'こんな目標をお持ちの方へ',
  },

  // 整体・マッサージ向け
  massage: {
    '解決策と提案': '痛みを解消する3ステップ',
    '根拠と証拠': '施術実績のデータ',
    'ベネフィット': '体が楽になる日々',
    '行動喚起': '初回予約はこちら',
    '感情的フック': '体の不調から解放される',
    '問題・課題': 'こんな症状でお困りでは？',
  },

  // クリニック・医療向け
  clinic: {
    '解決策と提案': '治療の3つのアプローチ',
    '根拠と証拠': '医学的エビデンス',
    'ベネフィット': '健康的な生活を取り戻す',
    '行動喚起': 'まずは相談から',
    'ターゲット読者': 'このような症状の方へ',
    '問題・課題': 'よくある健康の悩み',
  },

  // 教育・塾向け
  education: {
    '解決策と提案': '成績アップの3つの方法',
    '根拠と証拠': '合格実績データ',
    'ベネフィット': '学力が確実に向上',
    '行動喚起': '無料体験授業へ',
    '感情的フック': '成長の喜びを実感',
    'ターゲット読者': 'こんな生徒さんに最適',
  },

  // SaaS・IT向け
  saas: {
    '解決策と提案': 'プロダクトでやることはこの3つ',
    '根拠と証拠': 'データでわかる効果',
    'ベネフィット': '業務効率が劇的に改善',
    '行動喚起': '無料トライアルを開始',
    '問題・課題': 'よくある業務の課題',
    'ターゲット読者': 'こんな企業様におすすめ',
  },

  // 不動産向け
  realestate: {
    '解決策と提案': '物件選びの3つのポイント',
    '根拠と証拠': '成約実績データ',
    'ベネフィット': '理想の住まいが見つかる',
    '行動喚起': '物件見学の予約',
    '問題・課題': '物件探しのよくある悩み',
    'ターゲット読者': 'こんな方にぴったりの物件',
  },

  // 採用・人材向け
  recruitment: {
    '解決策と提案': '採用成功の3つの秘訣',
    '根拠と証拠': '採用実績データ',
    'ベネフィット': '優秀な人材が集まる',
    '行動喚起': 'エントリーはこちら',
    '感情的フック': '働きがいのある職場',
    'ターゲット読者': 'こんな方を求めています',
  }
}

/**
 * 業種を自動判定（キーワードベース）
 */
export function detectVertical(keywords: string): string {
  const verticalKeywords: Record<string, string[]> = {
    restaurant: ['レストラン', '飲食', '料理', 'ランチ', 'ディナー', '予約'],
    cafe: ['カフェ', 'コーヒー', 'ラテ', 'スイーツ', 'モーニング'],
    beauty: ['美容', 'ヘアサロン', 'カット', 'パーマ', 'カラー', 'ネイル'],
    retail: ['雑貨', '小売', '商品', '販売', 'ショップ'],
    fitness: ['ジム', 'フィットネス', 'トレーニング', '筋トレ', 'ダイエット'],
    massage: ['整体', 'マッサージ', '施術', '肩こり', '腰痛'],
    clinic: ['クリニック', '医院', '診療', '治療', '検査'],
    education: ['塾', 'スクール', '授業', '学習', '受験'],
    saas: ['SaaS', 'ソフトウェア', 'アプリ', 'システム', 'ツール'],
    realestate: ['不動産', '物件', '賃貸', 'マンション', '住宅'],
    recruitment: ['採用', '求人', '転職', 'キャリア', '人材']
  }

  const lowerKeywords = keywords.toLowerCase()
  
  for (const [vertical, terms] of Object.entries(verticalKeywords)) {
    if (terms.some(term => lowerKeywords.includes(term.toLowerCase()))) {
      return vertical
    }
  }
  
  return 'common'
}

/**
 * 業種別の見出し自然化を適用
 */
export function naturalizeHeadingsByVertical(
  content: string,
  vertical?: string,
  keywords?: string
): string {
  // 業種を判定
  const targetVertical = vertical || (keywords ? detectVertical(keywords) : 'common')
  
  // 該当業種のマップを取得（共通マップとマージ）
  const map = {
    ...headingMapByVertical.common,
    ...(headingMapByVertical[targetVertical] || {})
  }
  
  // 見出し変換を適用
  let result = content
  
  // Markdown見出しの変換
  result = result.replace(/^(#{1,6})\s*(.+)$/gm, (match, hashes, heading) => {
    const trimmedHeading = heading.trim()
    for (const [pattern, replacement] of Object.entries(map)) {
      if (trimmedHeading.includes(pattern)) {
        return `${hashes} ${replacement}`
      }
    }
    return match
  })
  
  // HTML見出しの変換
  result = result.replace(/<(h[1-6])([^>]*)>([^<]+)<\/\1>/gi, (match, tag, attrs, heading) => {
    const trimmedHeading = heading.trim()
    for (const [pattern, replacement] of Object.entries(map)) {
      if (trimmedHeading.includes(pattern)) {
        return `<${tag}${attrs}>${replacement}</${tag}>`
      }
    }
    return match
  })
  
  return result
}