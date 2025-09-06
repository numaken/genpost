// lib/version.ts - GenPost システムバージョン管理
export const GENPOST_VERSION = '2.1.0'
export const VERSION_DATE = '2024-12-06'
export const SYSTEM_NAME = 'GenPost'

export const VERSION_HISTORY = {
  '2.1.0': {
    date: '2024-12-06',
    features: [
      'panolabo AI エンジン統合',
      '声質プロンプト + 人肌フィルタ（二重ガード）',
      '見出し自動変換システム',
      'UI改善（人肌フィルタ切り替え）'
    ]
  },
  '2.0.0': {
    date: '2024-11-20',
    features: [
      '8+1 AI エンジンから panolabo AI エンジンにリブランド',
      '価格表示改善',
      'FAQ拡充'
    ]
  }
}

// バージョン情報を表示用に整形
export const getVersionInfo = () => {
  return {
    version: GENPOST_VERSION,
    date: VERSION_DATE,
    name: SYSTEM_NAME,
    fullName: `${SYSTEM_NAME} v${GENPOST_VERSION}`,
    buildInfo: `v${GENPOST_VERSION} (${VERSION_DATE})`
  }
}