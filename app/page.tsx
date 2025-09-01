'use client'

import { useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'
import PromptSelector from '@/components/PromptSelector'
import TrialPromptForm from '@/components/TrialPromptForm'
import WordPressSiteManager from '@/components/WordPressSiteManager'

interface WordPressSite {
  id: string
  site_name: string
  site_url: string
  wp_username: string
  wp_app_password: string
  default_category_id: number
  selected_prompt_id?: string
}

interface Generation {
  id: string
  promptId: string
  promptName: string
  count: number
  status: 'pending' | 'generating' | 'completed' | 'error'
  articles: any[]
  createdAt: string
}

export default function Home() {
  const { data: session } = useSession()
  const [selectedSite, setSelectedSite] = useState<WordPressSite | null>(null)
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null)
  const [promptInputs, setPromptInputs] = useState<Record<string, string>>({})
  const [articleCount, setArticleCount] = useState(1)
  const [postStatus, setPostStatus] = useState<'draft' | 'publish' | 'pending' | 'scheduled'>('draft')
  const [scheduledStartDate, setScheduledStartDate] = useState('')
  const [scheduledInterval, setScheduledInterval] = useState(1) // 間隔（日）
  const [isGenerating, setIsGenerating] = useState(false)
  const [generations, setGenerations] = useState<Generation[]>([])

  // サイト選択時の処理
  const handleSiteSelect = (site: WordPressSite | null) => {
    setSelectedSite(site)
    
    // サイトに保存されているプロンプトがあれば自動選択
    if (site?.selected_prompt_id) {
      setSelectedPrompt(site.selected_prompt_id)
    } else {
      setSelectedPrompt(null)
      setPromptInputs({})
    }
  }

  // プロンプト選択時の処理（サイトにも保存）
  const handlePromptSelect = (promptId: string) => {
    setSelectedPrompt(promptId)
    
    // 選択されたサイトにプロンプトIDを保存
    if (selectedSite) {
      updateSitePrompt(selectedSite.id, promptId)
    }
  }

  // サイトのプロンプト選択を更新
  const updateSitePrompt = async (siteId: string, promptId: string) => {
    try {
      const response = await fetch('/api/wordpress-sites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: siteId,
          selected_prompt_id: promptId
        })
      })

      if (response.ok) {
        // サイト情報を更新
        setSelectedSite(prev => prev ? { ...prev, selected_prompt_id: promptId } : null)
      }
    } catch (error) {
      console.error('Failed to update site prompt:', error)
    }
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
    
    if (!selectedPrompt) {
      alert('プロンプトを選択してください')
      return
    }

    if (postStatus === 'scheduled' && !scheduledStartDate) {
      alert('予約投稿の開始日時を設定してください')
      return
    }

    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            wpSiteUrl: selectedSite.site_url,
            wpUser: selectedSite.wp_username,
            wpAppPass: selectedSite.wp_app_password,
            categoryId: selectedSite.default_category_id.toString()
          },
          promptId: selectedPrompt,
          count: articleCount,
          postStatus: postStatus,
          scheduledStartDate: postStatus === 'scheduled' ? scheduledStartDate : undefined,
          scheduledInterval: postStatus === 'scheduled' ? scheduledInterval : undefined,
          inputs: promptInputs
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        setGenerations(prev => [result, ...prev])
        alert(`${articleCount}記事の生成が完了しました！`)
      } else {
        alert(`エラー: ${result.error}`)
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
              <Link href="/prompts" className="text-white hover:text-purple-200 transition-colors">
                プロンプト一覧
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
              <h2 className="text-3xl font-bold text-gray-800 mb-4">さらに多くの業界特化プロンプトを使いませんか？</h2>
              <p className="text-gray-600 mb-8">不動産、IT、美容、飲食など480+のプロフェッショナルプロンプトをご利用いただけます。</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => signIn()}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-colors"
                >
                  無料でアカウント作成
                </button>
                <Link 
                  href="/prompts"
                  className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors inline-block"
                >
                  全プロンプトを見る
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* プロンプト購入案内 */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-8 border border-purple-200">
              <h3 className="text-2xl font-bold text-gray-800 mb-3">
                🎯 無制限記事生成を開始
              </h3>
              <p className="text-gray-600 mb-4">
                プロンプトを購入して、業界特化のプロフェッショナル記事を無制限生成できます。<br/>
                WordPress自動投稿機能で効率的なコンテンツマーケティングを実現。
              </p>
              <div className="flex gap-4 text-sm text-gray-500">
                <span>✓ 480+業界特化プロンプト</span>
                <span>✓ WordPress自動投稿</span>
                <span>✓ 無制限記事生成</span>
              </div>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <WordPressSiteManager 
                onSiteSelect={handleSiteSelect}
                selectedSiteId={selectedSite?.id}
              />

            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center mb-6">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                <h2 className="text-2xl font-semibold text-gray-800">プロンプト選択・購入</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    プロンプト選択
                    {selectedSite && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({selectedSite.site_name}専用)
                      </span>
                    )}
                  </label>
                  <PromptSelector
                    selectedPrompt={selectedPrompt}
                    onPromptSelect={handlePromptSelect}
                    onInputsChange={setPromptInputs}
                  />
                </div>
                
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
                  disabled={isGenerating || !selectedPrompt || !selectedSite}
                  className={`w-full py-5 text-white font-bold rounded-xl text-lg shadow-lg transform transition-all duration-200 ${
                    isGenerating || !selectedPrompt || !selectedSite
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
                    <p className="font-medium">🛒 プロンプト購入後、無制限生成が可能です</p>
                    <p>🏠 WordPressサイトの登録・管理（2サイトまで無料）</p>
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
                      <span className="font-semibold text-gray-800">{gen.promptName || gen.promptId}</span>
                      <span className="ml-3 text-gray-500">({gen.count}記事)</span>
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
                    {new Date(gen.createdAt).toLocaleString('ja-JP')}
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