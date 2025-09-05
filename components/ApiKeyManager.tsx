'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export default function ApiKeyManager() {
  const { data: session } = useSession()
  const [apiKey, setApiKey] = useState('')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    checkApiKey()
  }, [session])

  const checkApiKey = async () => {
    if (!session) return

    try {
      const response = await fetch('/api/user-api-keys?service=openai')
      const data = await response.json()
      setHasApiKey(data.hasApiKey)
    } catch (error) {
      console.error('API key check error:', error)
    }
  }

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault()
    
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: 'APIキーを入力してください' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/user-api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim(), service: 'openai' })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: data.message })
        setHasApiKey(true)
        setApiKey('')
        setShowKey(false)
      } else {
        setMessage({ type: 'error', text: data.error || 'APIキーの保存に失敗しました' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'APIキーの保存中にエラーが発生しました' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('APIキーを削除しますか？削除後は共有APIキーが使用されます。')) return

    setDeleting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/user-api-keys?service=openai', {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: data.message })
        setHasApiKey(false)
        setApiKey('')
      } else {
        setMessage({ type: 'error', text: data.error || 'APIキーの削除に失敗しました' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'APIキーの削除中にエラーが発生しました' })
    } finally {
      setDeleting(false)
    }
  }

  if (!session) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-gray-600">ログインが必要です</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
        <h3 className="text-lg font-semibold text-gray-800">OpenAI APIキー設定</h3>
      </div>

      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">💡 APIキーについて</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 独自のOpenAI APIキーを設定すると、あなたのアカウントで記事生成が行われます</li>
            <li>• 設定しない場合は共有APIキーを使用します</li>
            <li>• APIキーは暗号化されて安全に保存されます</li>
            <li>• OpenAIのAPIキーは <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">こちら</a> から取得できます</li>
          </ul>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-700">現在の状態:</span>
            {hasApiKey ? (
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-sm rounded">
                ✅ 独自APIキー設定済み
              </span>
            ) : (
              <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded">
                🔄 共有APIキーを使用中
              </span>
            )}
          </div>

          {hasApiKey && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50"
            >
              {deleting ? '削除中...' : 'APIキーを削除'}
            </button>
          )}
        </div>

        <form onSubmit={handleSave}>
          {/* Hidden username field for accessibility */}
          <input type="text" name="username" autoComplete="username" className="sr-only" tabIndex={-1} />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OpenAI APIキー {!hasApiKey && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                name="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-************************"
                autoComplete="current-password"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-20"
                required
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showKey ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !apiKey.trim()}
            className="w-full px-4 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {saving ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                保存中...
              </div>
            ) : (
              hasApiKey ? 'APIキーを更新' : 'APIキーを保存'
            )}
          </button>
        </form>

        {message && (
          <div className={`rounded-lg p-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}