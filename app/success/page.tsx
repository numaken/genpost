'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function SuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [purchaseDetails, setPurchaseDetails] = useState<any>(null)

  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    
    if (!session) {
      router.push('/')
      return
    }

    if (sessionId) {
      // 購入確認処理
      setTimeout(() => {
        setIsLoading(false)
        setPurchaseDetails({
          sessionId,
          message: 'プロンプトの購入が完了しました！'
        })
      }, 2000)
    } else {
      setIsLoading(false)
    }
  }, [session, searchParams, router])

  if (!session) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">購入処理を確認中...</h2>
          <p className="text-gray-500 mt-2">しばらくお待ちください</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 text-white">
        <nav className="px-6 py-4">
          <div className="container mx-auto">
            <div className="text-xl font-bold">gen<span className="text-purple-200">post</span></div>
          </div>
        </nav>
      </header>

      <div className="container mx-auto py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            {/* 成功アイコン */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* メッセージ */}
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              🎉 購入完了！
            </h1>
            
            <p className="text-lg text-gray-600 mb-8">
              {purchaseDetails?.message || 'ご購入ありがとうございます！'}
            </p>

            {/* 詳細情報 */}
            <div className="bg-blue-50 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-gray-800 mb-3">次のステップ</h3>
              <div className="text-sm text-gray-600 space-y-2 text-left">
                <p>✓ プロンプトが利用可能になりました</p>
                <p>✓ メインページから記事生成を開始できます</p>
                <p>✓ 購入履歴はマイページで確認できます</p>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/"
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-colors"
              >
                記事生成を開始
              </Link>
              <Link 
                href="/pricing"
                className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                他のプロンプトを見る
              </Link>
            </div>

            {/* セッション情報（デバッグ用） */}
            {process.env.NODE_ENV === 'development' && purchaseDetails?.sessionId && (
              <div className="mt-8 p-4 bg-gray-100 rounded-lg">
                <p className="text-xs text-gray-500">
                  Session ID: {purchaseDetails.sessionId}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}