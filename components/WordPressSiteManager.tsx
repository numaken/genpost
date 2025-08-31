'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface WordPressSite {
  id: string
  site_name: string
  site_url: string
  wp_username: string
  wp_app_password: string
  default_category_id: number
  selected_prompt_id?: string
  created_at: string
}

interface SiteLimit {
  max_sites: number
  is_unlimited: boolean
  unlimited_expires_at?: string
}

interface WordPressSiteManagerProps {
  onSiteSelect: (site: WordPressSite | null) => void
  selectedSiteId?: string
}

export default function WordPressSiteManager({ onSiteSelect, selectedSiteId }: WordPressSiteManagerProps) {
  const { data: session } = useSession()
  const [sites, setSites] = useState<WordPressSite[]>([])
  const [siteLimit, setSiteLimit] = useState<SiteLimit>({ max_sites: 2, is_unlimited: false })
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingSite, setEditingSite] = useState<WordPressSite | null>(null)
  const [formData, setFormData] = useState({
    site_name: '',
    site_url: '',
    wp_username: '',
    wp_app_password: '',
    default_category_id: 1
  })
  const [submitting, setSubmitting] = useState(false)
  const [testingConnection, setTestingConnection] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, any>>({})

  useEffect(() => {
    if (session) {
      fetchSites()
    }
  }, [session])

  const fetchSites = async () => {
    try {
      const response = await fetch('/api/wordpress-sites')
      const data = await response.json()
      
      if (response.ok) {
        setSites(data.sites)
        setSiteLimit(data.limit)
        
        // 最初のサイトを自動選択
        if (data.sites.length > 0 && !selectedSiteId) {
          onSiteSelect(data.sites[0])
        } else if (selectedSiteId) {
          const selectedSite = data.sites.find((site: WordPressSite) => site.id === selectedSiteId)
          if (selectedSite) {
            onSiteSelect(selectedSite)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching sites:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const method = editingSite ? 'PUT' : 'POST'
      const body = editingSite 
        ? { site_id: editingSite.id, ...formData }
        : formData

      const response = await fetch('/api/wordpress-sites', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const result = await response.json()

      if (response.ok) {
        await fetchSites()
        setShowAddForm(false)
        setEditingSite(null)
        setFormData({
          site_name: '',
          site_url: '',
          wp_username: '',
          wp_app_password: '',
          default_category_id: 1
        })
        
        if (!editingSite) {
          onSiteSelect(result.site)
        }
        alert(editingSite ? 'サイト情報を更新しました' : 'サイトを追加しました')
      } else {
        alert(`エラー: ${result.error}`)
      }
    } catch (error) {
      alert('処理中にエラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (site: WordPressSite) => {
    setEditingSite(site)
    setFormData({
      site_name: site.site_name,
      site_url: site.site_url,
      wp_username: site.wp_username,
      wp_app_password: site.wp_app_password,
      default_category_id: site.default_category_id
    })
    setShowAddForm(true)
  }

  const handleDelete = async (siteId: string) => {
    if (!confirm('このサイトを削除しますか？')) return

    try {
      const response = await fetch(`/api/wordpress-sites?site_id=${siteId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchSites()
        if (selectedSiteId === siteId) {
          onSiteSelect(null)
        }
        alert('サイトを削除しました')
      } else {
        const result = await response.json()
        alert(`削除エラー: ${result.error}`)
      }
    } catch (error) {
      alert('削除中にエラーが発生しました')
    }
  }

  const handleTestConnection = async (site: WordPressSite) => {
    setTestingConnection(site.id)

    try {
      const response = await fetch('/api/test-wp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wpSiteUrl: site.site_url,
          wpUser: site.wp_username,
          wpAppPass: site.wp_app_password,
          categoryId: site.default_category_id
        })
      })

      const result = await response.json()
      setTestResults({ ...testResults, [site.id]: result })

      if (response.ok) {
        alert('接続テスト成功！')
      } else {
        alert(`接続テストエラー: ${result.error}`)
      }
    } catch (error) {
      alert('接続テスト中にエラーが発生しました')
    } finally {
      setTestingConnection(null)
    }
  }

  const handlePurchaseUnlimited = async () => {
    try {
      const response = await fetch('/api/purchase-unlimited-sites', {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok && data.url) {
        window.location.href = data.url
      } else {
        alert(`購入エラー: ${data.error}`)
      }
    } catch (error) {
      alert('購入処理中にエラーが発生しました')
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <span className="ml-3">サイト情報を読み込み中...</span>
        </div>
      </div>
    )
  }

  const canAddMoreSites = siteLimit.is_unlimited || sites.length < siteLimit.max_sites

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
          <h2 className="text-2xl font-semibold text-gray-800">WordPress サイト管理</h2>
        </div>
        <div className="text-sm text-gray-500">
          {siteLimit.is_unlimited ? (
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
              ✨ 無制限プラン
            </span>
          ) : (
            <span>
              {sites.length}/{siteLimit.max_sites} サイト使用中
            </span>
          )}
        </div>
      </div>

      {/* サイト一覧 */}
      <div className="space-y-4 mb-6">
        {sites.map((site) => (
          <div 
            key={site.id}
            className={`p-4 border-2 rounded-lg transition-colors cursor-pointer ${
              selectedSiteId === site.id 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onSiteSelect(site)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">{site.site_name}</h3>
                <p className="text-sm text-gray-600">{site.site_url}</p>
                <p className="text-xs text-gray-500 mt-1">
                  ユーザー: {site.wp_username} | カテゴリID: {site.default_category_id}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleTestConnection(site)
                  }}
                  disabled={testingConnection === site.id}
                  className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:opacity-50"
                >
                  {testingConnection === site.id ? '🔄' : '🔧'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEdit(site)
                  }}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                >
                  編集
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(site.id)
                  }}
                  className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                >
                  削除
                </button>
              </div>
            </div>

            {/* テスト結果表示 */}
            {testResults[site.id] && (
              <div className={`mt-3 p-4 rounded-lg text-sm ${
                testResults[site.id].success 
                  ? 'bg-green-50 border border-green-200 text-green-700' 
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {testResults[site.id].success ? (
                  <div>
                    <div className="font-semibold mb-2">✅ 接続テスト成功</div>
                    {testResults[site.id].testPost && (
                      <div className="text-xs text-green-600">
                        テスト投稿ID: {testResults[site.id].testPost.id}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="font-semibold mb-2">❌ 接続テスト失敗</div>
                    <div className="text-red-600 mb-3">{testResults[site.id].error}</div>
                    
                    {/* 詳細診断結果 */}
                    {testResults[site.id].troubleshooting?.detailedChecks && (
                      <div className="mb-4">
                        <div className="font-medium mb-2">🔍 診断結果：</div>
                        <div className="text-xs space-y-1">
                          {testResults[site.id].troubleshooting.detailedChecks.map((check: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center p-2 bg-red-25 rounded">
                              <span className="font-medium">{check.test}</span>
                              <span className={check.result.includes('✅') ? 'text-green-600' : 'text-red-600'}>
                                {check.result}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 問題の詳細 */}
                    {testResults[site.id].troubleshooting?.possibleIssues && testResults[site.id].troubleshooting.possibleIssues.length > 0 && (
                      <div className="mb-4">
                        <div className="font-medium mb-2">⚠️ 検出された問題：</div>
                        <ul className="text-xs space-y-1">
                          {testResults[site.id].troubleshooting.possibleIssues.map((issue: string, idx: number) => (
                            <li key={idx} className="flex items-start">
                              <span className="text-red-500 mr-2">•</span>
                              <span>{issue}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 解決方法 */}
                    {testResults[site.id].troubleshooting?.solutions && testResults[site.id].troubleshooting.solutions.length > 0 && (
                      <div className="mb-4">
                        <div className="font-medium mb-2">🔧 解決方法：</div>
                        <div className="text-xs space-y-1 max-h-48 overflow-y-auto">
                          {testResults[site.id].troubleshooting.solutions.map((solution: string, idx: number) => (
                            <div key={idx} className={solution.trim() === '' ? 'h-1' : 'leading-relaxed'}>
                              {solution.startsWith('   ') ? (
                                <div className="ml-4 text-gray-600 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                  {solution.trim()}
                                </div>
                              ) : solution.startsWith(' ') ? (
                                <div className="ml-3 text-gray-700">
                                  {solution.trim()}
                                </div>
                              ) : (
                                <div className="font-medium text-red-700">
                                  {solution}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 従来の推奨事項との互換性 */}
                    {testResults[site.id].recommendations && !testResults[site.id].troubleshooting?.solutions && (
                      <div className="mt-3">
                        <div className="font-medium mb-2">💡 解決方法：</div>
                        <ul className="text-xs space-y-1 list-disc list-inside">
                          {testResults[site.id].recommendations.map((rec: string, idx: number) => (
                            <li key={idx} className="break-words">{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* 技術詳細 */}
                    {testResults[site.id].details && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs text-red-500 hover:text-red-700">
                          技術詳細を表示
                        </summary>
                        <pre className="text-xs bg-red-100 p-2 rounded mt-2 overflow-auto max-h-32">
                          {JSON.stringify(testResults[site.id].details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {sites.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>登録されたWordPressサイトはありません</p>
            <p className="text-sm mt-2">最初のサイトを追加してください</p>
          </div>
        )}
      </div>

      {/* 追加・制限アップグレード */}
      <div className="flex gap-3">
        {canAddMoreSites ? (
          <button
            onClick={() => {
              setShowAddForm(true)
              setEditingSite(null)
              setFormData({
                site_name: '',
                site_url: '',
                wp_username: '',
                wp_app_password: '',
                default_category_id: 1
              })
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            ➕ サイト追加
          </button>
        ) : (
          <div className="flex-1">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-orange-700 font-medium">サイト数上限に達しました</p>
              <p className="text-orange-600 text-sm mt-1">
                無制限プラン（年額2,980円）で制限なくサイトを追加できます
              </p>
              <button
                onClick={handlePurchaseUnlimited}
                className="mt-3 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                🚀 無制限プランを購入
              </button>
            </div>
          </div>
        )}
      </div>

      {/* サイト追加・編集フォーム */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-6">
              {editingSite ? 'サイト編集' : 'サイト追加'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  サイト名
                </label>
                <input
                  type="text"
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  value={formData.site_name}
                  onChange={(e) => setFormData({...formData, site_name: e.target.value})}
                  placeholder="マイサイト"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  サイトURL
                </label>
                <input
                  type="url"
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  value={formData.site_url}
                  onChange={(e) => setFormData({...formData, site_url: e.target.value})}
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WordPressユーザー名
                </label>
                <input
                  type="text"
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  value={formData.wp_username}
                  onChange={(e) => setFormData({...formData, wp_username: e.target.value})}
                  placeholder="admin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  アプリケーションパスワード
                </label>
                <input
                  type="password"
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  value={formData.wp_app_password}
                  onChange={(e) => setFormData({...formData, wp_app_password: e.target.value})}
                  placeholder="xxxx xxxx xxxx xxxx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  デフォルトカテゴリID
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  value={formData.default_category_id}
                  onChange={(e) => setFormData({...formData, default_category_id: parseInt(e.target.value)})}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  {submitting ? '処理中...' : editingSite ? '更新' : '追加'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingSite(null)
                  }}
                  className="px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}