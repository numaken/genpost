'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Prompt {
  id: number
  prompt_id: string
  name: string
  description: string
  industry: string
  price: number
  is_free: boolean
}

export default function TestPurchasePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)

  useEffect(() => {
    fetchPrompts()
  }, [])

  const fetchPrompts = async () => {
    try {
      // 全プロンプトを取得（フィルターなし）
      const response = await fetch('/api/prompts?filter=all')
      const data = await response.json()
      
      if (response.ok) {
        // 有料プロンプトのみ表示
        const paidPrompts = data.prompts.filter((p: Prompt) => !p.is_free)
        setPrompts(paidPrompts)
      }
    } catch (error) {
      console.error('Error fetching prompts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTestPurchase = async (promptId: string) => {
    if (!session) {
      alert('ログインが必要です')
      return
    }

    setPurchasing(promptId)

    try {
      const response = await fetch('/api/test-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ promptId })
      })

      const data = await response.json()

      if (response.ok) {
        alert(`テスト購入完了: ${data.message}`)
        // ホームページにリダイレクト
        setTimeout(() => {
          router.push('/')
        }, 1000)
      } else {
        alert(`エラー: ${data.error}`)
      }
    } catch (error) {
      console.error('Test purchase error:', error)
      alert('テスト購入中にエラーが発生しました')
    } finally {
      setPurchasing(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto max-w-4xl">
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            🧪 テスト購入ツール
          </h1>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>開発・テスト環境専用</strong>
              <br />
              Stripeのテストモードや開発環境でWebhookが動作しない場合に、
              手動でプロンプト購入を記録するためのツールです。
            </p>
          </div>

          {!session && (
            <div className="text-center py-8">
              <p className="text-gray-600">ログインしてからご利用ください</p>
            </div>
          )}
        </div>

        {session && (
          <div className="grid gap-6">
            {prompts.map((prompt) => (
              <div key={prompt.prompt_id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">
                      {prompt.name}
                    </h3>
                    <p className="text-gray-600 mt-2">{prompt.description}</p>
                    <div className="flex items-center mt-3 text-sm text-gray-500">
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        {prompt.industry}
                      </span>
                      <span className="ml-3">
                        ¥{prompt.price.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleTestPurchase(prompt.prompt_id)}
                    disabled={purchasing === prompt.prompt_id}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${
                      purchasing === prompt.prompt_id
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {purchasing === prompt.prompt_id ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        記録中...
                      </div>
                    ) : (
                      '🧪 テスト購入'
                    )}
                  </button>
                </div>
              </div>
            ))}

            {prompts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">利用可能なプロンプトがありません</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}