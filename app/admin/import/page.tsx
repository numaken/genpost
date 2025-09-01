'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

export default function ImportPage() {
  const { data: session } = useSession()
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [status, setStatus] = useState<any>(null)

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/import-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' })
      })
      const data = await response.json()
      setStatus(data.status)
    } catch (error) {
      console.error('Status check error:', error)
    }
  }

  const handleImport = async () => {
    setImporting(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/import-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import' })
      })
      const data = await response.json()
      setResult(data)
      checkStatus() // 更新後のステータスを取得
    } catch (error) {
      setResult({ error: 'インポートに失敗しました', details: String(error) })
    } finally {
      setImporting(false)
    }
  }

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
            📦 カタログプロンプトインポート
          </h1>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>管理者専用機能</strong>
              <br />
              catalog.htmlから抽出した2,880個のプロンプトと8つの業界パックをSupabaseにインポートします。
            </p>
          </div>

          <div className="flex gap-4 mb-6">
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  インポート中...
                </div>
              ) : (
                '🚀 インポート開始'
              )}
            </button>
            
            <button
              onClick={checkStatus}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600"
            >
              📊 ステータス確認
            </button>
          </div>

          {status && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">現在の状況</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">プロンプト数:</span>
                  <span className="ml-2 font-medium">{status.prompts}</span>
                </div>
                <div>
                  <span className="text-gray-600">業界パック数:</span>
                  <span className="ml-2 font-medium">{status.packs}</span>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {result.success ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">✅ インポート完了</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">インポートしたプロンプト:</span>
                      <span className="ml-2 font-medium text-green-700">{result.imported.prompts}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">インポートした業界パック:</span>
                      <span className="ml-2 font-medium text-green-700">{result.imported.packs}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 mb-2">❌ インポートエラー</h3>
                  <p className="text-red-600">{result.error}</p>
                  {result.details && (
                    <p className="text-xs text-red-500 mt-2">{result.details}</p>
                  )}
                </div>
              )}

              {result.errors && result.errors.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-800 mb-2">⚠️ 部分的なエラー</h3>
                  <div className="max-h-40 overflow-auto">
                    {result.errors.map((error: string, index: number) => (
                      <p key={index} className="text-xs text-orange-600">{error}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">📋 インポートされるデータ</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 8つの業界（不動産、IT・SaaS、EC・物販、美容・健康、教育、飲食、金融、エンタメ）</li>
              <li>• 各業界360個のプロンプト（6形式 × 6用途 × 10バリエーション）</li>
              <li>• 合計2,880個のプロンプト</li>
              <li>• 業界パック販売（¥18,800〜¥25,800）</li>
              <li>• 個別販売（¥1,000〜¥4,000）</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}