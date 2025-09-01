'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function FixDataPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [fixing, setFixing] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleFix = async () => {
    if (!session) {
      alert('ログインが必要です')
      return
    }

    setFixing(true)
    setResult(null)

    try {
      const response = await fetch('/api/fix-purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      setResult(data)

      if (response.ok && data.fixed > 0) {
        alert(`${data.fixed}件の購入データを修正しました！`)
        setTimeout(() => {
          router.push('/')
        }, 2000)
      }
    } catch (error) {
      console.error('Fix error:', error)
      setResult({ error: '修正処理中にエラーが発生しました' })
    } finally {
      setFixing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto max-w-2xl">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            購入データ修正ツール
          </h1>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              ⚠️ このツールは購入済みプロンプトが表示されない問題を修正します。
              <br />
              購入したプロンプトが表示されない場合のみ実行してください。
            </p>
          </div>

          <button
            onClick={handleFix}
            disabled={fixing || !session}
            className={`w-full py-4 rounded-lg font-medium transition-all ${
              fixing || !session
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {fixing ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                修正中...
              </div>
            ) : (
              '購入データを修正する'
            )}
          </button>

          {result && (
            <div className={`mt-6 p-4 rounded-lg ${
              result.error
                ? 'bg-red-50 border border-red-200 text-red-700'
                : 'bg-green-50 border border-green-200 text-green-700'
            }`}>
              {result.error ? (
                <div>
                  <p className="font-medium">エラー:</p>
                  <p>{result.error}</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium">✅ 修正完了</p>
                  <p>{result.message}</p>
                </div>
              )}
            </div>
          )}

          {!session && (
            <div className="mt-4 text-center text-gray-600">
              ログインしてからお試しください
            </div>
          )}
        </div>
      </div>
    </div>
  )
}