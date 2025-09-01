'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export default function DebugPage() {
  const { data: session } = useSession()
  const [debugData, setDebugData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

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

          <button
            onClick={fetchDebugData}
            disabled={loading}
            className="mb-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? '読み込み中...' : '情報を再取得'}
          </button>

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
        </div>
      </div>
    </div>
  )
}