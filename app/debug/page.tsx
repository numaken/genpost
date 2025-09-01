'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export default function DebugPage() {
  const { data: session } = useSession()
  const [debugData, setDebugData] = useState<any>(null)
  const [fieldAnalysis, setFieldAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [analyzingFields, setAnalyzingFields] = useState(false)

  const fetchDebugData = async () => {
    if (!session) return

    setLoading(true)
    try {
      const response = await fetch('/api/debug-purchases')
      const data = await response.json()
      setDebugData(data)
    } catch (error) {
      console.error('Debug fetch error:', error)
      setDebugData({ error: 'データ取得に失敗しました' })
    } finally {
      setLoading(false)
    }
  }

  const fetchFieldAnalysis = async () => {
    if (!session) return

    setAnalyzingFields(true)
    try {
      const response = await fetch('/api/analyze-prompt-fields')
      const data = await response.json()
      setFieldAnalysis(data)
    } catch (error) {
      console.error('Field analysis error:', error)
      setFieldAnalysis({ error: 'フィールド分析に失敗しました' })
    } finally {
      setAnalyzingFields(false)
    }
  }

  useEffect(() => {
    fetchDebugData()
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
      <div className="container mx-auto max-w-4xl">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            🔍 デバッグ情報
          </h1>

          <div className="flex gap-4 mb-6">
            <button
              onClick={fetchDebugData}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '読み込み中...' : '基本情報を再取得'}
            </button>
            <button
              onClick={fetchFieldAnalysis}
              disabled={analyzingFields}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {analyzingFields ? 'フィールド分析中...' : 'フィールド分析'}
            </button>
          </div>

          {debugData && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">基本情報</h3>
                <p><strong>ユーザー:</strong> {debugData.debug?.userEmail}</p>
                <p><strong>環境:</strong> {debugData.debug?.environment?.nodeEnv}</p>
                <p><strong>Supabase URL:</strong> {debugData.debug?.environment?.supabaseUrl}</p>
                <p><strong>サービスキー:</strong> {debugData.debug?.environment?.hasServiceKey ? '✅' : '❌'}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">購入履歴 ({debugData.debug?.userPrompts?.count}件)</h3>
                <pre className="text-xs bg-white p-3 rounded overflow-auto max-h-64">
                  {JSON.stringify(debugData.debug?.userPrompts, null, 2)}
                </pre>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">購入済みプロンプト詳細</h3>
                <pre className="text-xs bg-white p-3 rounded overflow-auto max-h-64">
                  {JSON.stringify(debugData.debug?.purchasedPromptDetails, null, 2)}
                </pre>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">プロンプトサンプル</h3>
                <pre className="text-xs bg-white p-3 rounded overflow-auto max-h-64">
                  {JSON.stringify(debugData.debug?.promptsSample, null, 2)}
                </pre>
              </div>

              {debugData.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 mb-2">エラー</h3>
                  <p className="text-red-600">{debugData.error}</p>
                </div>
              )}
            </div>
          )}

          {/* フィールド分析結果 */}
          {fieldAnalysis && (
            <div className="space-y-6 mt-8">
              <h2 className="text-xl font-bold text-gray-800">📊 フィールド分析結果</h2>
              
              {fieldAnalysis.purchasedFields && fieldAnalysis.purchasedFields.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-3">🎯 購入済みプロンプトで使用されるフィールド</h3>
                  <div className="space-y-2">
                    {fieldAnalysis.purchasedFields.map((item: any) => (
                      <div key={item.field} className="bg-white rounded p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-red-600 bg-red-50 px-2 py-1 rounded">
                            {item.field}
                          </span>
                          <span className="text-sm text-gray-500">{item.count}回使用</span>
                        </div>
                        <div className="text-xs text-gray-600">
                          {item.prompts.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {fieldAnalysis.analysis && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">📈 統計</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">全プロンプト数:</span>
                      <span className="ml-2 font-medium">{fieldAnalysis.analysis.totalPrompts}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">全フィールド数:</span>
                      <span className="ml-2 font-medium">{fieldAnalysis.analysis.totalFields}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">購入済みプロンプト:</span>
                      <span className="ml-2 font-medium">{fieldAnalysis.analysis.purchasedPromptsCount}</span>
                    </div>
                  </div>
                </div>
              )}

              {fieldAnalysis.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 mb-2">フィールド分析エラー</h3>
                  <p className="text-red-600">{fieldAnalysis.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}