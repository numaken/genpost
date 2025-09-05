'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'
import TrialPromptForm from '@/components/TrialPromptForm'
import WordPressSiteManager from '@/components/WordPressSiteManager'
import ApiKeyManager from '@/components/ApiKeyManager'
import UsageDisplay from '@/components/UsageDisplay'

interface WordPressSite {
  id: string
  site_name: string
  site_url: string
  wp_username: string
  wp_app_password: string
  default_category_id: number
  category_slug?: string
  selected_prompt_id?: string
}

interface Generation {
  id: string
  keywords?: string
  engine?: string
  count: number
  status: 'pending' | 'generating' | 'completed' | 'error'
  articles: any[]
  createdAt: string
  success?: boolean
  message?: string
}

export default function Home() {
  const { data: session } = useSession()
  const [selectedSite, setSelectedSite] = useState<WordPressSite | null>(null)
  const [promptInputs, setPromptInputs] = useState<Record<string, string>>({})
  const [articleCount, setArticleCount] = useState(1)
  const [postStatus, setPostStatus] = useState<'draft' | 'publish' | 'pending' | 'scheduled'>('draft')
  const [scheduledStartDate, setScheduledStartDate] = useState('')
  const [scheduledInterval, setScheduledInterval] = useState(1) // 間隔（日）
  const [isGenerating, setIsGenerating] = useState(false)
  const [generations, setGenerations] = useState<Generation[]>([])
  const [keywordHistory, setKeywordHistory] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<'gpt-3.5-turbo' | 'gpt-4o-mini' | 'gpt-4'>('gpt-3.5-turbo')
  const [hasUserApiKey, setHasUserApiKey] = useState(false)

  // ローカルストレージからキーワード履歴を読み込み
  useEffect(() => {
    const savedHistory = localStorage.getItem('genpost-keyword-history')
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory)
        setKeywordHistory(Array.isArray(parsed) ? parsed.slice(0, 10) : []) // 最大10件
      } catch (error) {
        console.error('Failed to parse keyword history:', error)
      }
    }
  }, [])

  // ユーザーAPIキーの設定状況をチェック
  useEffect(() => {
    if (session) {
      checkUserApiKey()
    }
  }, [session])

  const checkUserApiKey = async () => {
    try {
      const response = await fetch('/api/user-api-keys?service=openai')
      const data = await response.json()
      setHasUserApiKey(data.hasApiKey)
    } catch (error) {
      console.error('Failed to check API key:', error)
    }
  }

  // キーワード履歴を更新する関数
  const addToKeywordHistory = (keyword: string) => {
    const trimmedKeyword = keyword.trim()
    if (!trimmedKeyword) return

    setKeywordHistory(prev => {
      // 重複を除去し、最新を先頭に追加
      const newHistory = [trimmedKeyword, ...prev.filter(k => k !== trimmedKeyword)].slice(0, 10)
      
      // ローカルストレージに保存
      localStorage.setItem('genpost-keyword-history', JSON.stringify(newHistory))
      
      return newHistory
    })
  }

  // サイト選択時の処理
  const handleSiteSelect = (site: WordPressSite | null) => {
    setSelectedSite(site)
    // キーワード入力欄は保持する（リセットしない）
  }

  const handleGenerate = async () => {
    if (!session) {
      alert('ログインが必要です')
      return
    }
    
    if (!selectedSite) {
      alert('WordPressサイトを選択してください')
      return
    }
    
    if (!promptInputs.keywords?.trim()) {
      alert('キーワードを入力してください')
      return
    }

    if (postStatus === 'scheduled' && !scheduledStartDate) {
      alert('予約投稿の開始日時を設定してください')
      return
    }

    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/generate-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: promptInputs.keywords?.trim(),
          site_url: selectedSite.site_url,
          category_slug: selectedSite.category_slug,
          count: articleCount,
          post_status: postStatus,
          scheduled_start_date: postStatus === 'scheduled' ? scheduledStartDate : undefined,
          scheduled_interval: postStatus === 'scheduled' ? scheduledInterval : undefined,
          model: hasUserApiKey ? selectedModel : 'gpt-3.5-turbo' // APIキー設定による条件分岐
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        // APIレスポンスを表示用のGeneration形式に変換
        const generation: Generation = {
          id: Date.now().toString(),
          keywords: promptInputs.keywords,
          engine: result.engine || 'v2-8plus1-simple',
          count: articleCount,
          status: result.success ? 'completed' : 'error',
          articles: result.articles || [],
          createdAt: new Date().toISOString(),
          success: result.success,
          message: result.message
        }
        
        setGenerations(prev => [generation, ...prev])
        
        // キーワード履歴に追加
        addToKeywordHistory(promptInputs.keywords || '')
        
        alert(result.message || `${articleCount}記事の生成が完了しました！`)
      } else {
        alert(`エラー: ${result.error || result.message}`)
      }
    } catch (error) {
      alert('生成中にエラーが発生しました')
    } finally {
      setIsGenerating(false)
    }
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        
        <nav className="relative z-10 px-6 py-4">
          <div className="container mx-auto flex justify-between items-center">
            <div className="text-xl font-bold">gen<span className="text-purple-200">post</span></div>
            <div className="flex items-center space-x-6">
              <Link href="/pricing" className="text-white hover:text-purple-200 transition-colors">
                料金表
              </Link>
              {session ? (
                <>
                  <div className="text-sm">
                    <span className="opacity-75">ようこそ、</span>
                    <span className="font-medium">{session.user?.name}さん</span>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
                  >
                    ログアウト
                  </button>
                </>
              ) : (
                <button
                  onClick={() => signIn()}
                  className="bg-white text-purple-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                >
                  ログイン
                </button>
              )}
            </div>
          </div>
        </nav>
        
        <div className="container mx-auto py-12 relative z-10">
          <div className="text-center">
            <div className="mb-6">
              <h1 className="text-6xl font-black tracking-tight mb-2">
                gen<span className="text-purple-200">post</span>
              </h1>
              <div className="h-1 w-24 bg-gradient-to-r from-purple-300 to-blue-300 mx-auto rounded-full"></div>
            </div>
            <p className="text-2xl font-light mb-4 text-blue-100">
              Generate. Post. Done.
            </p>
            <p className="text-lg opacity-90 max-w-2xl mx-auto">
              AI-powered WordPress article generator that creates high-quality content in seconds
            </p>
          </div>
        </div>
      </header>

      <div className="container mx-auto py-8">
        {!session ? (
          <div>
            {/* お試しセクション */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-16 border border-gray-100">
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold text-gray-800 mb-4">
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    無料で体験
                  </span>
                </h2>
                <p className="text-xl text-gray-600">
                  AIが作る記事の品質を今すぐ確認してください
                </p>
              </div>

              <div className="max-w-4xl mx-auto">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    📈 リピーター獲得記事作成
                  </h3>
                  <p className="text-gray-600">
                    客単価アップとリピーター増加を実現する実践的な記事を作成します
                  </p>
                </div>

                <TrialPromptForm />
              </div>
            </div>

            {/* ログイン促進セクション */}
            <div className="text-center py-16">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">8+1 AI エンジンで無制限記事生成をはじめませんか？</h2>
              <p className="text-gray-600 mb-8">AI が自動で最適化。あなたはキーワードを入力するだけで高品質記事を量産できます。</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => signIn()}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-colors"
                >
                  無料でアカウント作成
                </button>
                <Link 
                  href="/pricing"
                  className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors inline-block"
                >
                  料金を見る
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* プロンプト購入案内 */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-8 border border-purple-200">
              <h3 className="text-2xl font-bold text-gray-800 mb-3">
                ✨ 8+1 AI エンジンで記事生成開始
              </h3>
              <p className="text-gray-600 mb-4">
                AI が 8つの要素を自動最適化。あなたはキーワードを入力するだけで高品質記事を無制限生成。<br/>
                WordPress自動投稿機能で効率的なコンテンツマーケティングを実現。
              </p>
              <div className="flex gap-4 text-sm text-gray-500">
                <span>✓ AI自動最適化</span>
                <span>✓ WordPress自動投稿</span>
                <span>✓ 無制限記事生成</span>
              </div>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <WordPressSiteManager 
                onSiteSelect={handleSiteSelect}
                selectedSiteId={selectedSite?.id}
              />

              <ApiKeyManager />
              
              <UsageDisplay />
            </div>

            <div className="grid lg:grid-cols-1 gap-8 mt-8">

            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center mb-6">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                <h2 className="text-2xl font-semibold text-gray-800">記事生成</h2>
                {selectedSite && (
                  <span className="text-xs text-gray-500 ml-2">
                    ({selectedSite.site_name})
                  </span>
                )}
              </div>
              
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                    ✨ 8+1 AI エンジン
                    <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">自動最適化</span>
                  </h3>
                  <p className="text-sm text-gray-600">
                    AIが8つの要素を自動で最適化します。あなたはキーワードを入力するだけ。
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    キーワード（業界・商品・サービス名など）
                  </label>
                  <input
                    type="text"
                    placeholder="例：不動産投資、美容サロン、ITコンサルティング"
                    value={promptInputs.keywords || ''}
                    onChange={(e) => setPromptInputs(prev => ({ ...prev, keywords: e.target.value }))}
                    className="w-full p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  
                  {/* キーワード履歴 */}
                  {keywordHistory.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-gray-500 mb-2">最近使用したキーワード:</div>
                      <div className="flex flex-wrap gap-2">
                        {keywordHistory.map((keyword, index) => (
                          <button
                            key={index}
                            onClick={() => setPromptInputs(prev => ({ ...prev, keywords: keyword }))}
                            className="px-3 py-1 bg-gray-100 hover:bg-purple-100 text-gray-700 hover:text-purple-700 text-sm rounded-full transition-colors cursor-pointer border border-gray-200 hover:border-purple-300"
                          >
                            {keyword}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* モデル選択（独自APIキー設定時のみ表示） */}
                {hasUserApiKey && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      AIモデル選択
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">独自APIキー</span>
                    </label>
                    <select 
                      className="w-full p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors bg-white"
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value as 'gpt-3.5-turbo' | 'gpt-4o-mini' | 'gpt-4')}
                    >
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo（高速・低コスト）</option>
                      <option value="gpt-4o-mini">GPT-4o Mini（高品質・バランス型）</option>
                      <option value="gpt-4">GPT-4（最高品質・高コスト）</option>
                    </select>
                    <div className="text-xs text-gray-500 mt-2">
                      独自APIキー使用時はお好みのモデルを選択できます
                    </div>
                  </div>
                )}

                {/* 共有APIキー使用時の表示 */}
                {!hasUserApiKey && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="text-blue-600 mr-2">🚀</div>
                      <div>
                        <h4 className="font-medium text-blue-800">スタータープラン</h4>
                        <p className="text-sm text-blue-700">
                          GPT-3.5 Turboを使用中（弊社負担）
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          より高性能なモデルをご希望の場合は、独自APIキーを設定してください
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">記事数</label>
                  <select 
                    className="w-full p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors bg-white"
                    value={articleCount}
                    onChange={(e) => setArticleCount(Number(e.target.value))}
                  >
                    <option value={1}>1記事</option>
                    <option value={3}>3記事</option>
                    <option value={5}>5記事</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">投稿ステータス</label>
                  <select 
                    className="w-full p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors bg-white"
                    value={postStatus}
                    onChange={(e) => setPostStatus(e.target.value as 'draft' | 'publish' | 'pending' | 'scheduled')}
                  >
                    <option value="draft">下書き（確認後に公開）</option>
                    <option value="publish">即座に公開</option>
                    <option value="pending">レビュー待ち</option>
                    <option value="scheduled">📅 予約投稿（1ヶ月分散投稿）</option>
                  </select>
                </div>

                {/* 予約投稿設定 */}
                {postStatus === 'scheduled' && (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      📅 予約投稿設定
                      <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">人気機能</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          開始日時
                        </label>
                        <input
                          type="datetime-local"
                          value={scheduledStartDate}
                          onChange={(e) => setScheduledStartDate(e.target.value)}
                          min={new Date().toISOString().slice(0, 16)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          投稿間隔
                        </label>
                        <select
                          value={scheduledInterval}
                          onChange={(e) => setScheduledInterval(Number(e.target.value))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={1}>毎日</option>
                          <option value={2}>2日間隔</option>
                          <option value={3}>3日間隔</option>
                          <option value={7}>週1回</option>
                        </select>
                      </div>
                    </div>
                    
                    {scheduledStartDate && (
                      <div className="mt-4 p-3 bg-white rounded border">
                        <p className="text-sm text-gray-600">
                          <strong>📋 投稿予定:</strong><br/>
                          {Array.from({ length: articleCount }, (_, i) => {
                            const date = new Date(scheduledStartDate)
                            date.setDate(date.getDate() + (i * scheduledInterval))
                            return `${i + 1}記事目: ${date.toLocaleDateString('ja-JP')} ${date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`
                          }).join('\n')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !promptInputs.keywords?.trim() || !selectedSite}
                  className={`w-full py-5 text-white font-bold rounded-xl text-lg shadow-lg transform transition-all duration-200 ${
                    isGenerating || !promptInputs.keywords?.trim() || !selectedSite
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:shadow-xl hover:-translate-y-0.5'
                  }`}
                >
                  {isGenerating ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                      生成中...
                    </div>
                  ) : (
                    `${articleCount}記事を生成`
                  )}
                </button>
              </div>
              
              <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2 mr-4"></div>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p className="font-medium">🛒 プロンプト購入後、記事生成が可能です（プランに応じた制限あり）</p>
                    <p>🏠 WordPressサイトの登録・管理（プランに応じて2-20サイト）</p>
                    <p>✨ 投稿ステータス（下書き/公開/予約投稿）を選択できます</p>
                    <p>📅 予約投稿で1ヶ月分の記事を自動分散投稿</p>
                    <p>⚡ 生成には30秒～2分程度かかります</p>
                    <p>📝 WordPressダッシュボードで確認・公開してください</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        )}

        {generations.length > 0 && (
          <div className="mt-12 bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center mb-8">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <h2 className="text-2xl font-semibold text-gray-800">生成履歴</h2>
            </div>
            <div className="space-y-4">
              {generations.map((gen) => (
                <div key={gen.id} className="p-6 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-gray-800">
                        {gen.keywords || gen.engine || 'AI記事生成'}
                      </span>
                      <span className="ml-3 text-gray-500">({gen.count}記事)</span>
                      {gen.engine && (
                        <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                          {gen.engine}
                        </span>
                      )}
                    </div>
                    <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                      gen.status === 'completed' 
                        ? 'bg-green-100 text-green-700 border border-green-200' 
                        : gen.status === 'error'
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}>
                      {gen.status === 'completed' ? '✓ 完了' : 
                       gen.status === 'error' ? '✗ エラー' : '⟳ 処理中'}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 mt-3">
                    {gen.createdAt ? new Date(gen.createdAt).toLocaleString('ja-JP') : '日時不明'}
                    {gen.message && (
                      <div className="mt-1 text-xs text-gray-400">
                        {gen.message}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}