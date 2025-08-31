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
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto py-8">
          <h1 className="text-4xl font-bold text-center">
            🚀 WordPress記事自動生成システム
          </h1>
          <p className="text-center mt-4 text-xl">
            AIが5分で高品質記事を生成 → WordPress自動投稿
          </p>
        </div>
      </header>

      <div className="container mx-auto py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* 設定パネル */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6">⚙️ WordPress設定</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">サイトURL</label>
                <input
                  type="url"
                  placeholder="https://your-site.com"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={config.wpSiteUrl}
                  onChange={(e) => setConfig({...config, wpSiteUrl: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">ユーザー名</label>
                <input
                  type="text"
                  placeholder="admin"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={config.wpUser}
                  onChange={(e) => setConfig({...config, wpUser: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">アプリケーションパスワード</label>
                <input
                  type="password"
                  placeholder="xxxx xxxx xxxx xxxx"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={config.wpAppPass}
                  onChange={(e) => setConfig({...config, wpAppPass: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">カテゴリID</label>
                <input
                  type="number"
                  placeholder="1"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={config.categoryId}
                  onChange={(e) => setConfig({...config, categoryId: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* 生成パネル */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6">📝 記事生成</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">プロンプトパック</label>
                <select 
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium mb-2">生成記事数</label>
                <select 
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                disabled={isGenerating}
                className={`w-full py-4 text-white font-bold rounded-lg text-xl ${
                  isGenerating 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600'
                }`}
              >
                {isGenerating ? '🔄 生成中...' : `🚀 ${articleCount}記事を生成する`}
              </button>
            </div>
            
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                🛡️ 記事は下書き状態で投稿されます<br/>
                ⚡ 生成には約30秒〜2分かかります<br/>
                📝 WordPress管理画面で内容確認後に公開してください
              </p>
            </div>
          </div>
        </div>

        {/* 実行履歴 */}
        {generations.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6">📊 実行履歴</h2>
            <div className="space-y-4">
              {generations.map((gen) => (
                <div key={gen.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{gen.pack}</span>
                      <span className="ml-2 text-gray-600">({gen.count}記事)</span>
                    </div>
                    <div className={`px-3 py-1 rounded text-sm ${
                      gen.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : gen.status === 'error'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {gen.status === 'completed' ? '✅ 完了' : 
                       gen.status === 'error' ? '❌ エラー' : '🔄 処理中'}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
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