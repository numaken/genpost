'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export default function FieldAnalysisPage() {
  const { data: session } = useSession()
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchAnalysis = async () => {
    if (!session) return

    setLoading(true)
    try {
      const response = await fetch('/api/analyze-prompt-fields')
      const data = await response.json()
      setAnalysis(data)
    } catch (error) {
      console.error('Analysis fetch error:', error)
      setAnalysis({ error: 'データ取得に失敗しました' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalysis()
  }, [session])

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>ログインが必要です</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto max-w-6xl">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            📊 プロンプトフィールド分析
          </h1>

          <button
            onClick={fetchAnalysis}
            disabled={loading}
            className="mb-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? '分析中...' : '再分析'}
          </button>

          {analysis && (
            <div className="space-y-6">
              {/* 概要 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">分析概要</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">全プロンプト数:</span>
                    <span className="ml-2 font-medium">{analysis.analysis?.totalPrompts}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">全フィールド数:</span>
                    <span className="ml-2 font-medium">{analysis.analysis?.totalFields}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">購入済みプロンプト:</span>
                    <span className="ml-2 font-medium">{analysis.analysis?.purchasedPromptsCount}</span>
                  </div>
                </div>
              </div>

              {/* 購入済みプロンプトで使用されるフィールド */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-blue-800">🎯 購入済みプロンプトで使用されるフィールド</h3>
                {analysis.purchasedFields?.length > 0 ? (
                  <div className="space-y-2">
                    {analysis.purchasedFields.map((item: any) => (
                      <div key={item.field} className="bg-white rounded p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-red-600">{item.field}</span>
                          <span className="text-sm text-gray-500">{item.count}回使用</span>
                        </div>
                        <div className="text-xs text-gray-600">
                          使用プロンプト例: {item.prompts.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">購入済みプロンプトがありません</p>
                )}
              </div>

              {/* 全フィールド分析 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">📋 全フィールド分析（使用頻度順）</h3>
                <div className="max-h-96 overflow-auto">
                  <div className="space-y-1">
                    {analysis.analysis?.fieldAnalysis && Object.entries(analysis.analysis.fieldAnalysis).map(([field, data]: [string, any]) => (
                      <div key={field} className={`flex items-center justify-between p-2 rounded text-sm ${
                        data.purchased ? 'bg-blue-100 border border-blue-200' : 'bg-white'
                      }`}>
                        <span className={`font-medium ${data.purchased ? 'text-blue-800' : 'text-gray-700'}`}>
                          {field} {data.purchased && '⭐'}
                        </span>
                        <span className="text-gray-500">{data.count}回</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {analysis.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 mb-2">エラー</h3>
                  <p className="text-red-600">{analysis.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}