'use client'

import { useState, useEffect } from 'react'

interface Config {
  wpSiteUrl: string
  wpUser: string
  wpAppPass: string
  categoryId: string
}

interface Generation {
  id: string
  pack: string
  count: number
  status: 'pending' | 'generating' | 'completed' | 'error'
  articles: any[]
  createdAt: string
}

export default function Home() {
  const [config, setConfig] = useState<Config>({
    wpSiteUrl: '',
    wpUser: '',
    wpAppPass: '',
    categoryId: '1'
  })
  
  const [selectedPack, setSelectedPack] = useState('tech:wordpress')
  const [articleCount, setArticleCount] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generations, setGenerations] = useState<Generation[]>([])

  const promptPacks = [
    { id: 'tech:wordpress', name: 'WordPress技術記事', description: '初心者向けWordPress解説記事' },
    { id: 'cooking:lunch', name: '昼食レシピ記事', description: '簡単で美味しい昼食レシピ' },
    { id: 'travel:domestic', name: '国内旅行記事', description: '国内観光スポット紹介' },
    { id: 'sidebiz:affiliate', name: 'アフィリエイト記事', description: '商品紹介・レビュー記事' }
  ]

  const handleGenerate = async () => {
    if (!config.wpSiteUrl || !config.wpUser || !config.wpAppPass) {
      alert('WordPress設定を入力してください')
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
          pack: selectedPack,
          count: articleCount
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
      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="container mx-auto py-16 relative z-10">
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
        <div className="grid lg:grid-cols-2 gap-8">
          {/* 設定パネル */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
              <h2 className="text-2xl font-semibold text-gray-800">WordPress Connection</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Site URL</label>
                <input
                  type="url"
                  placeholder="https://your-wordpress-site.com"
                  className="w-full p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                  value={config.wpSiteUrl}
                  onChange={(e) => setConfig({...config, wpSiteUrl: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Username</label>
                <input
                  type="text"
                  placeholder="admin"
                  className="w-full p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                  value={config.wpUser}
                  onChange={(e) => setConfig({...config, wpUser: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Application Password</label>
                <input
                  type="password"
                  placeholder="xxxx xxxx xxxx xxxx"
                  className="w-full p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                  value={config.wpAppPass}
                  onChange={(e) => setConfig({...config, wpAppPass: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Category ID</label>
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

          {/* 生成パネル */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
              <h2 className="text-2xl font-semibold text-gray-800">Content Generation</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Content Template</label>
                <select 
                  className="w-full p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors bg-white"
                  value={selectedPack}
                  onChange={(e) => setSelectedPack(e.target.value)}
                >
                  {promptPacks.map(pack => (
                    <option key={pack.id} value={pack.id}>
                      {pack.name} - {pack.description}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Article Count</label>
                <select 
                  className="w-full p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors bg-white"
                  value={articleCount}
                  onChange={(e) => setArticleCount(Number(e.target.value))}
                >
                  <option value={1}>1 Article</option>
                  <option value={3}>3 Articles</option>
                  <option value={5}>5 Articles</option>
                </select>
              </div>
              
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={`w-full py-5 text-white font-bold rounded-xl text-lg shadow-lg transform transition-all duration-200 ${
                  isGenerating 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:shadow-xl hover:-translate-y-0.5'
                }`}
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                    Generating...
                  </div>
                ) : (
                  `Generate ${articleCount} Article${articleCount > 1 ? 's' : ''}`
                )}
              </button>
            </div>
            
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2 mr-4"></div>
                <div className="text-sm text-gray-700 space-y-1">
                  <p className="font-medium">✨ Articles are saved as drafts</p>
                  <p>⚡ Generation takes 30 seconds to 2 minutes</p>
                  <p>📝 Review and publish from your WordPress dashboard</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 実行履歴 */}
        {generations.length > 0 && (
          <div className="mt-12 bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center mb-8">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <h2 className="text-2xl font-semibold text-gray-800">Generation History</h2>
            </div>
            <div className="space-y-4">
              {generations.map((gen) => (
                <div key={gen.id} className="p-6 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-gray-800">{gen.pack}</span>
                      <span className="ml-3 text-gray-500">({gen.count} article{gen.count > 1 ? 's' : ''})</span>
                    </div>
                    <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                      gen.status === 'completed' 
                        ? 'bg-green-100 text-green-700 border border-green-200' 
                        : gen.status === 'error'
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}>
                      {gen.status === 'completed' ? '✓ Completed' : 
                       gen.status === 'error' ? '✗ Error' : '⟳ Processing'}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 mt-3">
                    {new Date(gen.createdAt).toLocaleString('en-US')}
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