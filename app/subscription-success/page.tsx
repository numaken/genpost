'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function SubscriptionSuccessPage() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const [verificationResult, setVerificationResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const sessionId = searchParams.get('session_id')
  const planId = searchParams.get('plan_id')

  useEffect(() => {
    const verifySubscription = async () => {
      if (!sessionId) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/subscribe-plan?session_id=${sessionId}`)
        const result = await response.json()
        setVerificationResult(result)
      } catch (error) {
        console.error('Subscription verification error:', error)
        setVerificationResult({ success: false, error: 'サブスクリプションの確認に失敗しました' })
      } finally {
        setLoading(false)
      }
    }

    verifySubscription()
  }, [sessionId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">サブスクリプションを確認中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {verificationResult?.success && verificationResult?.subscribed ? (
            // 成功
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                🎉 サブスクリプション開始！
              </h1>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-green-800 mb-2">
                  {verificationResult.planName} にご加入いただきました
                </h2>
                <p className="text-green-700">
                  panolabo AI v2.1パワーアップエンジンの全機能をお楽しみください！
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="text-left bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">利用開始までの流れ：</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                    <li>WordPressサイトを接続</li>
                    <li>業種・ターゲットを設定</li>
                    <li>Pack選択（プランに含まれる範囲内）</li>
                    <li>記事生成を開始</li>
                  </ol>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href="/"
                  className="px-8 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                >
                  ダッシュボードへ
                </Link>
                <Link 
                  href="/pricing"
                  className="px-8 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  料金プランを確認
                </Link>
              </div>
            </div>
          ) : (
            // エラー
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                サブスクリプションの確認に失敗
              </h1>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                <p className="text-red-700">
                  {verificationResult?.error || 'サブスクリプションの処理中にエラーが発生しました。'}
                </p>
                <p className="text-red-600 text-sm mt-2">
                  お支払いは正常に処理されている場合があります。しばらく待ってからダッシュボードをご確認ください。
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href="/"
                  className="px-8 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                >
                  ダッシュボードを確認
                </Link>
                <Link 
                  href="/pricing"
                  className="px-8 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  料金プランに戻る
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}