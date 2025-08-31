'use client'

import { useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'
import PromptSelector from '@/components/PromptSelector'

interface Config {
  wpSiteUrl: string
  wpUser: string
  wpAppPass: string
  categoryId: string
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
  const [config, setConfig] = useState<Config>({
    wpSiteUrl: '',
    wpUser: '',
    wpAppPass: '',
    categoryId: '1'
  })
  
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null)
  const [promptInputs, setPromptInputs] = useState<Record<string, string>>({})
  const [articleCount, setArticleCount] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generations, setGenerations] = useState<Generation[]>([])

  const handleGenerate = async () => {
    if (!session) {
      alert('ログインが必要です')
      return
    }
    
    if (!config.wpSiteUrl || !config.wpUser || !config.wpAppPass) {
      alert('WordPress設定を入力してください')
      return
    }
    
    if (!selectedPrompt) {
      alert('プロンプトを選択してください')
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
          config,
          promptId: selectedPrompt,
          count: articleCount,
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
              <Link href="/pricing" className="text-white hover:text-purple-200 transition-colors">
                プロンプト一覧
              </Link>
              {session ? (
                <>
                  <div className="text-sm">
                    <span className="opacity-75">ようこそ、</span>
                    <span className="font-medium">{session.user?.name}さん</span>
                  </div>
                  <div className="text-xs bg-white/20 px-3 py-1 rounded-full">
                    {(session.user as any)?.plan || 'FREE'}プラン
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
          <div className="text-center py-16">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">ログインが必要です</h2>
            <p className="text-gray-600 mb-8">genpostを使用するには、アカウントにログインしてください。</p>
            <button
              onClick={() => signIn()}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-colors"
            >
              ログインして始める
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center mb-6">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <h2 className="text-2xl font-semibold text-gray-800">WordPress接続設定</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">サイトURL</label>
                  <input
                    type="url"
                    placeholder="https://あなたのサイト.com"
                    className="w-full p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                    value={config.wpSiteUrl}
                    onChange={(e) => setConfig({...config, wpSiteUrl: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">ユーザー名</label>
                  <input
                    type="text"
                    placeholder="admin"
                    className="w-full p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                    value={config.wpUser}
                    onChange={(e) => setConfig({...config, wpUser: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">アプリケーションパスワード</label>
                  <input
                    type="password"
                    placeholder="xxxx xxxx xxxx xxxx"
                    className="w-full p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                    value={config.wpAppPass}
                    onChange={(e) => setConfig({...config, wpAppPass: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">カテゴリID</label>
                  <input
                    type="number"
                    placeholder="1"
                    className="w-full p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                    value={config.categoryId}
                    onChange={(e) => setConfig({...config, categoryId: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center mb-6">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                <h2 className="text-2xl font-semibold text-gray-800">コンテンツ生成</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">プロンプト選択</label>
                  <PromptSelector
                    selectedPrompt={selectedPrompt}
                    onPromptSelect={setSelectedPrompt}
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
                
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !selectedPrompt}
                  className={`w-full py-5 text-white font-bold rounded-xl text-lg shadow-lg transform transition-all duration-200 ${
                    isGenerating || !selectedPrompt
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
                    <p className="font-medium">✨ 記事は下書きとして保存されます</p>
                    <p>⚡ 生成には30秒～2分程度かかります</p>
                    <p>📝 WordPressダッシュボードで確認・公開してください</p>
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