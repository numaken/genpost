'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

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
    id: 'free',
    name: 'フリープラン',
    price: 0,
    priceYearly: 0,
    maxArticles: 5,
    features: [
      '月5記事まで生成可能',
      '450+種類のプロンプト使用可能',
      'WordPress自動投稿',
      '重複記事チェック',
      '基本サポート'
    ],
    buttonText: '無料で始める',
    buttonColor: 'bg-gray-500 hover:bg-gray-600'
  },
  {
    id: 'basic',
    name: 'ベーシックプラン',
    price: 980,
    priceYearly: 9800,
    maxArticles: 50,
    features: [
      '月50記事まで生成可能',
      '450+種類のプロンプト使用可能',
      'WordPress自動投稿',
      '重複記事チェック',
      '予約投稿機能',
      'メールサポート'
    ],
    buttonText: 'ベーシックプランを選ぶ',
    buttonColor: 'bg-blue-500 hover:bg-blue-600'
  },
  {
    id: 'pro',
    name: 'プロプラン',
    price: 2980,
    priceYearly: 29800,
    maxArticles: 200,
    features: [
      '月200記事まで生成可能',
      '450+種類のプロンプト使用可能',
      'WordPress自動投稿',
      '重複記事チェック',
      '予約投稿機能',
      '複数サイト管理',
      '優先サポート'
    ],
    popular: true,
    buttonText: 'プロプランを選ぶ',
    buttonColor: 'bg-green-500 hover:bg-green-600'
  },
  {
    id: 'unlimited',
    name: '無制限プラン',
    price: 4980,
    priceYearly: 49800,
    maxArticles: 999999,
    features: [
      '記事生成数無制限',
      '450+種類のプロンプト使用可能',
      'WordPress自動投稿',
      '重複記事チェック',
      '予約投稿機能',
      '複数サイト管理',
      '専用サポート',
      '新機能優先アクセス'
    ],
    buttonText: '無制限プランを選ぶ',
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
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
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
              2ヶ月分お得!
            </span>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-lg border-2 p-6 ${
              plan.popular 
                ? 'border-green-500 bg-green-50 transform scale-105' 
                : 'border-gray-200 bg-white'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-green-500 text-white px-3 py-1 text-xs font-medium rounded-full">
                  人気
                </span>
              </div>
            )}

            <div className="text-center">
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

              <ul className="text-left space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePlanSelect(plan.id)}
                className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${plan.buttonColor}`}
              >
                {plan.buttonText}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-semibold text-blue-800 mb-3">💡 独自APIキーオプション</h4>
          <div className="text-sm text-blue-700 space-y-2">
            <p>どのプランでも、独自のOpenAI APIキーを設定することで<strong>記事生成数無制限</strong>でご利用いただけます。</p>
            <p>OpenAI API の使用料金は直接OpenAIにお支払いいただきます。</p>
            <p>APIキー設定により、より高度なGPT-4モデルも利用可能になります。</p>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-gray-500">
        <p>※価格は税込みです。※プランはいつでも変更・解約が可能です。</p>
      </div>
    </div>
  )
}