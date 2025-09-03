'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
// import { getABTestStats, startABTest, stopABTest } from '@/lib/prompt-versions' // サーバーサイド専用なのでコメントアウト
import Link from 'next/link'

interface ABTestStats {
  [version: string]: {
    count: number
    avgQuality: number
    avgTime: number
  }
}

interface ABTestConfig {
  id: string
  prompt_id: string
  test_name: string
  version_a: string
  version_b: string
  traffic_split: number
  is_active: boolean
  target_sample_size: number
}

export default function ABTestDashboard() {
  const { data: session } = useSession()
  const [abTests, setABTests] = useState<ABTestConfig[]>([])
  const [stats, setStats] = useState<{ [promptId: string]: ABTestStats }>({})
  const [loading, setLoading] = useState(true)

  const fetchABTests = useCallback(async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/admin/ab-tests')
      const data = await response.json()
      
      if (response.ok) {
        setABTests(data.tests || [])
        
        // 統計は後でAPIから取得するようにする（一旦スキップ）
        const statsData: { [promptId: string]: ABTestStats } = {}
        // TODO: 統計データをAPIから取得する実装を追加
        setStats(statsData)
      } else {
        console.error('A/Bテスト取得エラー:', data.error)
      }
    } catch (error) {
      console.error('A/Bテスト取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session) {
      fetchABTests()
    }
  }, [session, fetchABTests])

  const handleToggleTest = useCallback(async (promptId: string, isActive: boolean) => {
    try {
      // API経由でテスト状態を切り替え
      const response = await fetch('/api/admin/ab-tests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt_id: promptId, 
          is_active: !isActive 
        })
      })
      
      if (response.ok) {
        // データを再取得
        await fetchABTests()
      } else {
        const data = await response.json()
        console.error('A/Bテスト切り替えエラー:', data.error)
      }
      
    } catch (error) {
      console.error('A/Bテスト切り替えエラー:', error)
    }
  }, [fetchABTests])

  const calculateImprovement = (versionA: any, versionB: any, metric: string) => {
    if (!versionA || !versionB) return null
    
    const valueA = versionA[metric] || 0
    const valueB = versionB[metric] || 0
    
    if (valueA === 0) return null
    
    const improvement = ((valueB - valueA) / valueA) * 100
    return improvement
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            A/Bテスト管理画面
          </h1>
          <p className="text-gray-600 mb-6">ログインが必要です</p>
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            ホームに戻る
          </Link>
        </div>
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">A/Bテスト管理</h1>
            <p className="text-gray-600 mt-2">プロンプト改良版の効果測定</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            ダッシュボード
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">A/Bテストデータを読み込み中...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {abTests.map((test) => {
              const testStats = stats[test.prompt_id] || {}
              const versionAStats = testStats[test.version_a]
              const versionBStats = testStats[test.version_b]
              
              const qualityImprovement = calculateImprovement(versionAStats, versionBStats, 'avgQuality')
              const timeImprovement = calculateImprovement(versionAStats, versionBStats, 'avgTime')
              
              return (
                <div key={test.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {test.test_name}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        プロンプトID: {test.prompt_id}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          test.is_active 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {test.is_active ? '実行中' : '停止中'}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => handleToggleTest(test.prompt_id, test.is_active)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          test.is_active
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-green-500 text-white hover:bg-green-600'
                        }`}
                      >
                        {test.is_active ? '停止' : '開始'}
                      </button>
                    </div>
                  </div>

                  {/* テスト設定 */}
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-gray-700 mb-1">
                        トラフィック分割
                      </div>
                      <div className="text-lg font-semibold">
                        {Math.round(test.traffic_split * 100)}% 改良版
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-gray-700 mb-1">
                        目標サンプル数
                      </div>
                      <div className="text-lg font-semibold">
                        {test.target_sample_size}件
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-gray-700 mb-1">
                        現在のサンプル数
                      </div>
                      <div className="text-lg font-semibold">
                        {(versionAStats?.count || 0) + (versionBStats?.count || 0)}件
                      </div>
                    </div>
                  </div>

                  {/* 統計比較 */}
                  {(versionAStats || versionBStats) && (
                    <div className="border-t pt-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        パフォーマンス比較
                      </h4>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-4">指標</th>
                              <th className="text-center py-2 px-4">{test.version_a} (従来版)</th>
                              <th className="text-center py-2 px-4">{test.version_b} (改良版)</th>
                              <th className="text-center py-2 px-4">改善度</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b">
                              <td className="py-3 px-4 font-medium">サンプル数</td>
                              <td className="py-3 px-4 text-center">{versionAStats?.count || 0}</td>
                              <td className="py-3 px-4 text-center">{versionBStats?.count || 0}</td>
                              <td className="py-3 px-4 text-center">-</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-3 px-4 font-medium">平均品質スコア</td>
                              <td className="py-3 px-4 text-center">
                                {versionAStats ? versionAStats.avgQuality.toFixed(2) : '-'}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {versionBStats ? versionBStats.avgQuality.toFixed(2) : '-'}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {qualityImprovement !== null ? (
                                  <span className={qualityImprovement > 0 ? 'text-green-600 font-semibold' : 'text-red-600'}>
                                    {qualityImprovement > 0 ? '+' : ''}{qualityImprovement.toFixed(1)}%
                                  </span>
                                ) : '-'}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-3 px-4 font-medium">平均生成時間</td>
                              <td className="py-3 px-4 text-center">
                                {versionAStats ? `${Math.round(versionAStats.avgTime)}ms` : '-'}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {versionBStats ? `${Math.round(versionBStats.avgTime)}ms` : '-'}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {timeImprovement !== null ? (
                                  <span className={timeImprovement < 0 ? 'text-green-600 font-semibold' : 'text-red-600'}>
                                    {timeImprovement > 0 ? '+' : ''}{timeImprovement.toFixed(1)}%
                                  </span>
                                ) : '-'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {abTests.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  A/Bテストが設定されていません
                </h3>
                <p className="text-gray-600">
                  データベースにA/Bテスト設定を追加してください
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}