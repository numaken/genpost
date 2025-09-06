// lib/detectVertical.ts - キーワードから業種を自動判定

import { VerticalKey } from './headingMapByVertical'

/**
 * キーワードから業種を自動判定
 */
export function detectVertical(keywords: string): VerticalKey {
  const kw = keywords.toLowerCase()
  
  // 飲食店・レストラン
  if (kw.match(/レストラン|飲食|料理|メニュー|店舗|来店|予約|食事|カフェ|居酒屋|バー|グルメ|味|美味|シェフ|コック|厨房/)) {
    return 'restaurant'
  }
  
  // 小売・EC
  if (kw.match(/販売|売上|商品|在庫|EC|ネットショップ|通販|買い物|購入|顧客|リピート|セール|割引|価格|ブランド/)) {
    return 'retail'
  }
  
  // サービス業
  if (kw.match(/サービス|接客|顧客満足|カスタマー|サポート|コンサル|代行|清掃|配送|修理|メンテナンス/)) {
    return 'service'
  }
  
  // 医療・健康
  if (kw.match(/健康|医療|病院|クリニック|治療|診療|薬|症状|病気|予防|検査|リハビリ|介護|ケア|ヘルスケア/)) {
    return 'healthcare'
  }
  
  // 教育・スクール
  if (kw.match(/教育|学習|スクール|塾|講座|授業|生徒|学生|先生|教師|資格|試験|勉強|習い事|英語|プログラミング/)) {
    return 'education'
  }
  
  // 不動産
  if (kw.match(/不動産|物件|賃貸|売買|マンション|アパート|戸建|土地|住宅|引越|リフォーム|投資用|駅近/)) {
    return 'realestate'
  }
  
  // 金融・保険
  if (kw.match(/金融|保険|投資|資産|運用|貯金|ローン|クレジット|銀行|証券|FP|ファイナンシャル|年金|税金/)) {
    return 'finance'
  }
  
  // IT・Tech
  if (kw.match(/IT|システム|アプリ|ソフト|クラウド|AI|DX|デジタル|プログラム|開発|ウェブ|サイト|セキュリティ|データ/)) {
    return 'tech'
  }
  
  // 美容・エステ
  if (kw.match(/美容|エステ|化粧品|スキンケア|メイク|髪|ヘアサロン|ネイル|マッサージ|痩身|脱毛|アンチエイジング/)) {
    return 'beauty'
  }
  
  // 観光・旅行
  if (kw.match(/旅行|観光|ツアー|ホテル|宿泊|温泉|リゾート|海外|国内|名所|グルメ|お土産|航空|電車|バス/)) {
    return 'tourism'
  }
  
  // 製造業
  if (kw.match(/製造|工場|生産|品質|安全|効率|コスト|機械|設備|部品|材料|加工|組立|検査|改善/)) {
    return 'manufacturing'
  }
  
  // デフォルト
  return 'common'
}