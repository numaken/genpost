'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import Link from 'next/link'

interface PromptWithStatus {
  id: string
  prompt_id: string
  industry: string
  name: string
  description: string
  price: number
  is_free: boolean
  purpose: string
  format: string
  purchased?: boolean
  available?: boolean
}

export default function PricingPage() {
  const { data: session } = useSession()
  const [prompts, setPrompts] = useState<PromptWithStatus[]>([])
  const [groupedPrompts, setGroupedPrompts] = useState<Record<string, PromptWithStatus[]>>({})
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)

  useEffect(() => {
    fetchPrompts()
  }, [])

  const fetchPrompts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/prompts?filter=all')
      const data = await response.json()
      
      if (response.ok) {
        setPrompts(data.prompts)
        setGroupedPrompts(data.grouped)
      }
    } catch (error) {
      console.error('Error fetching prompts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (promptId: string) => {
    if (!session) {
      signIn()
      return
    }

    try {
      setPurchasing(promptId)
      const response = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId })
      })

      const data = await response.json()

      if (response.ok && data.url) {
        window.location.href = data.url
      } else {
        alert(`購入エラー: ${data.error}`)
      }
    } catch (error) {
      alert('購入処理中にエラーが発生しました')
    } finally {
      setPurchasing(null)
    }
  }

  const getIndustryIcon = (industry: string) => {
    const icons: Record<string, string> = {
      'real-estate': '🏠',
      'tech-saas': '💻',
      'ecommerce': '🛒',
      'beauty-health': '🏥',
      'education': '📚',
      'restaurant': '🍽️',
      'finance': '💰',
      'entertainment': '🎮',
      'affiliate': '💸',
      'blogging': '📝'
    }
    return icons[industry] || '📄'
  }

  const getIndustryName = (industry: string) => {
    const names: Record<string, string> = {
      'real-estate': '不動産',
      'tech-saas': 'IT・SaaS',
      'ecommerce': 'EC・物販',
      'beauty-health': '美容・健康',
      'education': '教育',
      'restaurant': '飲食',
      'finance': '金融',
      'entertainment': 'エンタメ',
      'affiliate': 'アフィリエイト',
      'blogging': 'ブログ'
    }
    return names[industry] || industry
  }

  const freePrompts = prompts.filter(p => p.is_free)
  const paidPrompts = prompts.filter(p => !p.is_free)
  const totalPrompts = prompts.length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 text-white">
        <nav className="px-6 py-4">
          <div className="container mx-auto flex justify-between items-center">
            <Link href="/" className="text-xl font-bold">
              gen<span className="text-purple-200">post</span>
            </Link>
            <div className="flex items-center space-x-4">
              {session ? (
                <div className="text-sm">
                  <span className="opacity-75">ようこそ、</span>
                  <span className="font-medium">{session.user?.name}さん</span>
                </div>
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

        <div className="container mx-auto py-16 px-6">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">プロンプトマーケットプレイス</h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              業界特化型のAIプロンプトで、高品質なコンテンツを瞬時に生成
            </p>
            
            <div className="flex justify-center items-center gap-8 text-lg">
              <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-lg">
                <span className="font-bold text-2xl">{totalPrompts}</span>
                <p className="text-sm text-blue-100">プロンプト総数</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-lg">
                <span className="font-bold text-2xl">{freePrompts.length}</span>
                <p className="text-sm text-blue-100">無料プロンプト</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-lg">
                <span className="font-bold text-2xl">{Object.keys(groupedPrompts).length}</span>
                <p className="text-sm text-blue-100">業界カテゴリ</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto py-12 px-6">
        {/* プラン概要 */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">価格プラン</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            
            {/* スターター */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 relative">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">スターター</h3>
                <div className="text-4xl font-bold text-green-600 mb-1">¥0</div>
                <p className="text-gray-500">無料で始める</p>
              </div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {freePrompts.length}個の無料プロンプト
                </li>
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  基本的な記事生成
                </li>
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  WordPress自動投稿
                </li>
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  コミュニティサポート
                </li>
              </ul>
              
              <Link 
                href="/"
                className="w-full bg-green-500 text-white text-center py-3 px-6 rounded-lg font-medium hover:bg-green-600 transition-colors block"
              >
                無料で始める
              </Link>
            </div>

            {/* プロ */}
            <div className="bg-white rounded-xl shadow-xl border-2 border-blue-500 p-8 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-6 py-2 rounded-full text-sm font-medium">
                  おすすめ
                </span>
              </div>
              
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">プロ</h3>
                <div className="text-4xl font-bold text-blue-600 mb-1">¥980</div>
                <p className="text-gray-500">1プロンプトあたり</p>
              </div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  スターターの全機能
                </li>
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  高品質プレミアムプロンプト
                </li>
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  業界特化カスタマイズ
                </li>
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  G.E.N.システム最適化
                </li>
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  優先サポート
                </li>
              </ul>
              
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-4">必要なプロンプトを個別購入</p>
              </div>
            </div>

            {/* エンタープライズ */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">エンタープライズ</h3>
                <div className="text-4xl font-bold text-purple-600 mb-1">お問い合わせ</div>
                <p className="text-gray-500">カスタムソリューション</p>
              </div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  プロの全機能
                </li>
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  カスタムプロンプト開発
                </li>
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  API統合サポート
                </li>
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  専任サポート担当者
                </li>
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  SLA保証
                </li>
              </ul>
              
              <button className="w-full bg-purple-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-600 transition-colors">
                お問い合わせ
              </button>
            </div>
          </div>
        </div>

        {/* プロンプト一覧 */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-500">プロンプトを読み込み中...</p>
          </div>
        ) : (
          <div>
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">利用可能なプロンプト</h2>
            
            {Object.entries(groupedPrompts).map(([industry, industryPrompts]) => (
              <div key={industry} className="mb-12">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                      <span className="text-2xl">{getIndustryIcon(industry)}</span>
                      {getIndustryName(industry)}
                      <span className="text-sm text-gray-500 font-normal">({industryPrompts.length}個のプロンプト)</span>
                    </h3>
                  </div>
                  
                  <div className="p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {industryPrompts.map((prompt) => (
                      <div key={prompt.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-semibold text-gray-800 flex-1">{prompt.name}</h4>
                          <div className="flex items-center gap-2 ml-3">
                            {prompt.is_free ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                                無料
                              </span>
                            ) : prompt.purchased ? (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                購入済み
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                                ¥{prompt.price.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">{prompt.description}</p>
                        <div className="text-xs text-gray-500 mb-4">
                          {prompt.purpose} / {prompt.format}
                        </div>
                        
                        {!prompt.is_free && !prompt.purchased && (
                          <button
                            onClick={() => handlePurchase(prompt.prompt_id)}
                            disabled={purchasing === prompt.prompt_id}
                            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {purchasing === prompt.prompt_id ? '処理中...' : '購入する'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}