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
  features: string[]
  popular?: boolean
  buttonText: string
  buttonColor: string
}

const plans: PricingPlan[] = [
  {
    id: 'starter',
    name: 'スターター',
    price: 2480,
    priceYearly: 24800,
    maxArticles: 25, // 20-30記事の中央値
    features: [
      '月20-30記事まで生成可能（デイリー上限1本/日）',
      '当社キーでGPT-3.5 Turbo使用',
      'WordPress自動投稿（2サイト）',
      '重複記事チェック',
      'ソフトキャップ+10%',
      '超過分翌月繰越 or 従量アドオン',
      '独自APIキー設定時は当社月間上限の対象外*',
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
    maxArticles: 100, // 80-120記事の中央値
    features: [
      '月80-120記事まで生成可能（デイリー上限5本/日）',
      '当社キーでGPT-4o-mini使用',
      'WordPress自動投稿（5サイト）',
      'カスタムプロンプト作成機能',
      '重複記事チェック',
      '予約投稿機能',
      'ソフトキャップ+10%',
      '超過分翌月繰越 or 従量アドオン',
      '独自APIキー設定時は当社月間上限の対象外*',
      '優先サポート'
    ],
    popular: true,
    buttonText: 'プロプランを選ぶ',
    buttonColor: 'bg-green-500 hover:bg-green-600'
  },
  {
    id: 'agency',
    name: 'エージェンシー',
    price: 9800,
    priceYearly: 98000,
    maxArticles: 400, // 300-500記事の中央値
    features: [
      '月300-500記事まで生成可能（デイリー上限20本/日）',
      '当社キーでGPT-4o-mini使用',
      'WordPress自動投稿（20サイト）',
      '5席まで利用可能',
      '重複記事チェック',
      '予約投稿機能',
      'ソフトキャップ+10%',
      '超過分翌月繰越 or 従量アドオン',
      '独自APIキー設定時は当社月間上限の対象外*',
      '優先サポート（24時間以内返信）'
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

    if (planId === 'free') {
      alert('フリープランは既に利用中です')
      return
    }

    // Stripe決済の実装はここに追加
    console.log(`Selected plan: ${planId}, yearly: ${isYearly}`)
    alert('決済機能は準備中です。お問い合わせください。')
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 w-full max-w-6xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">料金プラン</h2>
        <p className="text-gray-600 mb-6">あなたのニーズに合ったプランをお選びください</p>
        
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

      <div className="flex flex-wrap justify-center gap-6 items-stretch max-w-6xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-lg border-2 p-6 flex flex-col h-full w-full max-w-sm ${
              plan.popular 
                ? 'border-green-500 bg-green-50 transform scale-105 shadow-lg' 
                : 'border-gray-200 bg-white shadow-md hover:shadow-lg transition-shadow'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-green-500 text-white px-3 py-1 text-xs font-medium rounded-full">
                  人気
                </span>
              </div>
            )}

            <div className="text-center flex flex-col h-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {plan.name}
              </h3>
              
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">
                  ¥{isYearly ? plan.priceYearly.toLocaleString() : plan.price.toLocaleString()}
                </span>
                <span className="text-gray-500 text-sm ml-1">
                  /{isYearly ? '年' : '月'}
                </span>
              </div>

              {isYearly && plan.price > 0 && (
                <div className="text-sm text-gray-600 mb-4">
                  月額換算: ¥{Math.floor(plan.priceYearly / 12).toLocaleString()}
                </div>
              )}

              <div className="mb-6">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {plan.maxArticles === 999999 ? '無制限' : `${plan.maxArticles}記事`}
                </div>
                <div className="text-sm text-gray-500">月間生成可能記事数</div>
              </div>

              <ul className="text-left space-y-3 mb-6 flex-grow">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <button
                  onClick={() => handlePlanSelect(plan.id)}
                  className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${plan.buttonColor}`}
                >
                  {plan.buttonText}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-semibold text-blue-800 mb-3">💡 独自APIキーオプション</h4>
          <div className="text-sm text-blue-700 space-y-2">
            <p>どのプランでも、独自のOpenAI APIキーを設定することで<strong>当社側の月間上限の対象外</strong>となります。</p>
            <p>OpenAI API の使用料金は直接OpenAIにお支払いいただきます。公正利用（レート制限・同時実行制限）は適用されます。</p>
            <p>APIキー設定により、GPT-4、GPT-4o等の高性能モデルもご利用いただけます。</p>
          </div>
        </div>
      </div>

      {/* FAQ セクション */}
      <div className="mt-12 bg-gray-50 border border-gray-200 rounded-lg p-8">
        <h3 className="text-2xl font-bold text-center text-gray-900 mb-6">よくあるご質問</h3>
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Q. BYOK（独自APIキー）だと本当に上限なし？</h4>
              <p className="text-gray-600">A. 当社側の月間上限の対象外になります。公正利用（レート制限・同時実行の制限）は適用されます。料金はお客様のOpenAI契約に準拠します。</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Q. どのAIモデルが使えますか？</h4>
              <p className="text-gray-600">A. スターターは当社キーでGPT-3.5、プロ/エージェンシーは当社キーでGPT-4o-miniまで。BYOKではGPT-4、GPT-4o等の高性能モデルも選択可能です。</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Q. WordPress接続サイト数は？</h4>
              <p className="text-gray-600">A. スターター=2サイト、プロ=5サイト、エージェンシー=20サイトまで接続可能です。</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Q. 記事生成のコスト目安（BYOK/GPT-3.5）</h4>
              <p className="text-gray-600">A. 記事長により変動します。短文想定（1,000-2,000トークン）で1記事あたり約1–3円の目安。最新のOpenAI価格に準拠します。</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Q. 月間上限を超えた場合は？</h4>
              <p className="text-gray-600">A. ソフトキャップ+10%まで利用可能。超過分は翌月繰越または従量アドオン（10記事ごと¥200）でご利用いただけます。</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Q. 無料で試せますか？</h4>
              <p className="text-gray-600">A. はい！登録後すぐに5記事まで無料生成でき、WordPress自動投稿もお試しいただけます。</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA セクション */}
      <div className="mt-8 text-center bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6">
        <h4 className="text-xl font-bold text-gray-900 mb-2">🚀 今すぐ無料で始めよう</h4>
        <p className="text-gray-600 mb-4">5記事無料生成 → WordPress自動投稿まで体験できます</p>
        {!session ? (
          <button
            onClick={() => alert('無料アカウント作成機能は準備中です')}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-colors"
          >
            無料でアカウント作成
          </button>
        ) : (
          <Link href="/" className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-colors">
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