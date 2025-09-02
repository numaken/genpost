'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface UsageInfo {
  sharedApiCount: number
  userApiCount: number
  totalCount: number
  currentMonth: string
  maxSharedApiArticles: number
  planType: string
  planName: string
  hasUserApiKey: boolean
}

export default function UsageDisplay() {
  const { data: session } = useSession()
  const [usage, setUsage] = useState<UsageInfo | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchUsage()
  }, [session])

  const fetchUsage = async () => {
    if (!session) return

    setLoading(true)
    try {
      const response = await fetch('/api/usage')
      if (response.ok) {
        const data = await response.json()
        setUsage(data)
      }
    } catch (error) {
      console.error('Usage fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return null
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  if (!usage) {
    return null
  }

  const remainingShared = Math.max(0, usage.maxSharedApiArticles - usage.sharedApiCount)
  const usagePercentage = (usage.sharedApiCount / usage.maxSharedApiArticles) * 100

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
        <h3 className="text-lg font-semibold text-gray-800">使用状況</h3>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">現在のプラン</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded font-medium">
              {usage.planName}
            </span>
          </div>
          
          {usage.hasUserApiKey ? (
            <div className="text-center py-4">
              <div className="text-green-600 font-medium mb-2">✅ 独自APIキー使用中</div>
              <div className="text-sm text-gray-600">制限なしで記事生成が可能です</div>
            </div>
          ) : (
            <>
              <div className="mb-2">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>共有APIキー使用量</span>
                  <span>{usage.sharedApiCount} / {usage.maxSharedApiArticles} 記事</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      usagePercentage >= 100 ? 'bg-red-500' :
                      usagePercentage >= 80 ? 'bg-yellow-500' :
                      'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                {remainingShared > 0 ? (
                  <span>今月あと <strong>{remainingShared}記事</strong> 生成可能</span>
                ) : (
                  <div className="text-red-600 font-medium">
                    今月の制限に達しました。
                    <Link href="/pricing" className="text-blue-600 underline hover:text-blue-800">
                      プランアップグレード
                    </Link>
                    または独自APIキーの設定をご検討ください。
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{usage.totalCount}</div>
            <div className="text-gray-500">総記事数（今月）</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{usage.userApiCount}</div>
            <div className="text-gray-500">独自API記事数</div>
          </div>
        </div>

        <div className="text-xs text-gray-500 text-center">
          対象期間: {usage.currentMonth}
        </div>
      </div>
    </div>
  )
}