'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface PricingPlan {
  id: string
  name: string
  price: number
  priceYearly: number
  maxArticles: number
  maxSites: number
  seats: number
  features: string[]
  popular?: boolean
  buttonText: string
  buttonColor: string
  target: string
  badge?: string
}

const plans: PricingPlan[] = [
  {
    id: 'starter',
    name: 'スターター',
    price: 2480,
    priceYearly: 24800,
    maxArticles: 30,
    maxSites: 2,
    seats: 1,
    target: '小規模オーナー向け',
    features: [
      '見出しの自然化（What/How/Why → 読者の言葉）',
      '人肌フィルタ（紋切り表現を軽く除去）',
      'WordPress 自動投稿（2サイト／下書き・予約対応）',
      '※ 標準モデルで動作。BYOKで上位モデルも選択可',
      'メールサポート'
    ],
    buttonText: 'スタータープランを選ぶ',
    buttonColor: 'bg-blue-500 hover:bg-blue-600'
  },
  {
    id: 'pro',
    name: 'プロプラン',
    price: 4980,
    priceYearly: 49800,
    maxArticles: 100,
    maxSites: 5,
    seats: 1,
    target: '本格運用向け',
    badge: '人気',
    popular: true,
    features: [
      '上記に 推敲フロー（Draft→Critique→Revise） を追加',
      'タイトル自然化／重複記事チェック',
      'WordPress 5サイト',
      '※ 標準モデル＋BYOK対応',
      '優先サポート'
    ],
    buttonText: 'プロプランを選ぶ',
    buttonColor: 'bg-green-500 hover:bg-green-600'
  },
  {
    id: 'agency',
    name: 'エージェンシー',
    price: 9800,
    priceYearly: 98000,
    maxArticles: 500,
    maxSites: 20,
    seats: 5,
    target: '記事代行・制作向け',
    features: [
      'Packライブラリ（業種オーバーレイ）／A/B最適化（UCB）',
      '重複記事チェック／予約投稿／5席',
      'WordPress 20サイト',
      '※ 標準モデル＋BYOKで上位モデル選択可／優先サポート',
      'チーム機能'
    ],
    buttonText: 'エージェンシープランを選ぶ',
    buttonColor: 'bg-purple-500 hover:bg-purple-600'
  }
]

export default function PricingTable() {
  const { data: session } = useSession()
  const [isYearly, setIsYearly] = useState(false)

  const handlePlanSelect = async (planId: string) => {
    if (!session) {
      alert('プランの選択にはログインが必要です')
      return
    }

    try {
      const response = await fetch('/api/subscribe-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          isYearly
        })
      })

      const result = await response.json()

      if (result.success && result.checkoutUrl) {
        // Stripe Checkoutページにリダイレクト
        window.location.href = result.checkoutUrl
      } else {
        alert(result.error || 'プラン選択に失敗しました')
      }
    } catch (error) {
      console.error('Plan selection error:', error)
      alert('プラン選択中にエラーが発生しました')
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 w-full max-w-6xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">料金プラン</h2>
        <p className="text-gray-600 mb-4">あなたのニーズに合ったプランをお選びください</p>
        <div className="inline-block bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-6">
          <span className="text-sm text-blue-800">
            💡 通知×クーポン導線のテンプレで<strong>+7万円/月の上乗せ（例）</strong>
          </span>
        </div>
        
        {/* 月額/年額切り替え */}
        <div className="flex items-center justify-center mb-8">
          <span className={`text-sm font-medium ${!isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
            月額払い
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className={`mx-3 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isYearly ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isYearly ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
            年額払い
          </span>
          {isYearly && (
            <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
              2ヶ月分お得（年額¥4,960-¥23,520お得）
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-xl border-2 p-6 flex flex-col h-full ${
              plan.popular 
                ? 'border-green-500 bg-gradient-to-b from-green-50 to-white transform scale-105 shadow-xl' 
                : 'border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:border-gray-300'
            }`}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-green-500 text-white px-3 py-1 text-xs font-bold rounded-full shadow-md">
                  {plan.badge}
                </span>
              </div>
            )}

            <div className="text-center flex flex-col h-full">
              {/* プラン名とターゲット */}
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {plan.name}
                </h3>
                <p className="text-sm text-gray-500">{plan.target}</p>
              </div>
              
              {/* 価格 */}
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">
                  ¥{isYearly ? plan.priceYearly.toLocaleString() : plan.price.toLocaleString()}
                </span>
                <span className="text-gray-500 text-sm ml-1">
                  /{isYearly ? '年' : '月'}
                </span>
                {isYearly && plan.price > 0 && (
                  <div className="text-sm text-gray-600 mt-1">
                    月額換算: ¥{Math.floor(plan.priceYearly / 12).toLocaleString()}
                  </div>
                )}
              </div>

              {/* スペック表示 */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">記事数:</span>
                    <span className="font-semibold text-blue-600">{plan.maxArticles}/月</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">サイト:</span>
                    <span className="font-semibold">{plan.maxSites}サイト</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">席数:</span>
                    <span className="font-semibold">{plan.seats}席</span>
                  </div>
                </div>
              </div>

              {/* 機能一覧 */}
              <ul className="text-left space-y-3 mb-6 flex-grow">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* ボタン */}
              <div className="mt-auto">
                <button
                  onClick={() => handlePlanSelect(plan.id)}
                  className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-300 transform hover:scale-105 ${plan.buttonColor}`}
                >
                  {plan.buttonText}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* BYOKセクション */}
      <div className="mt-12">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-4xl mx-auto">
          <h3 className="text-xl font-semibold text-blue-800 mb-3">BYOK（独自APIキー）対応</h3>
          <p className="text-sm text-blue-700">
            どのプランでも OpenAI のご自身のAPIキーを設定できます。当社側の月間上限の対象外でご利用可能（公正利用に基づくレート制限あり）。料金はOpenAIから直接請求されます。GPT-4o など上位モデルの選択も可（提供状況に準拠）。
          </p>
        </div>
      </div>

      {/* アドオンセクション */}
      <div className="mt-12">
        <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">アドオン</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <h4 className="font-semibold text-gray-800 mb-2">RAG Data Pack</h4>
            <p className="text-2xl font-bold text-blue-600 mb-2">¥3,980</p>
            <p className="text-sm text-gray-600">業種別テンプレート（買い切り）</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <h4 className="font-semibold text-gray-800 mb-2">追加席</h4>
            <p className="text-2xl font-bold text-blue-600 mb-2">¥980/月</p>
            <p className="text-sm text-gray-600">チームメンバー追加</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <h4 className="font-semibold text-gray-800 mb-2">追加サイト</h4>
            <p className="text-2xl font-bold text-blue-600 mb-2">¥1,480/月</p>
            <p className="text-sm text-gray-600">WordPress接続サイト追加</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <h4 className="font-semibold text-gray-800 mb-2">導入支援</h4>
            <p className="text-2xl font-bold text-blue-600 mb-2">¥29,800</p>
            <p className="text-sm text-gray-600">90分の初期設定サポート</p>
          </div>
        </div>
      </div>


      {/* CTA セクション */}
      <div className="mt-8 text-center bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6">
        <h4 className="text-xl font-bold text-gray-900 mb-2">🚀 無料で始める</h4>
        <p className="text-gray-600 mb-4">見出し自然化＋人肌フィルタを基本機能でお試しできます</p>
        {!session ? (
          <button
            onClick={() => alert('無料アカウント作成機能は準備中です')}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-colors"
            id="main-cta"
          >
            無料で始める
          </button>
        ) : (
          <Link 
            href="/" 
            className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-colors"
            id="main-cta"
          >
            ダッシュボードへ
          </Link>
        )}
      </div>

      <div className="mt-6 text-center text-xs text-gray-500">
        <p>※価格は税込みです。※プランはいつでも変更・解約が可能です。</p>
        <p>*独自APIキー使用時も公正利用・レート制限は適用されます。</p>
      </div>
    </div>
  )
}