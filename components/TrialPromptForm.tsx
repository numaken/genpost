'use client'

import { useState } from 'react'

export default function TrialPromptForm() {
  const [formData, setFormData] = useState({
    industry: '',
    service: '',
    challenge: ''
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedArticle, setGeneratedArticle] = useState<{title: string, content: string} | null>(null)
  const [error, setError] = useState('')

  const industryOptions = [
    { value: 'cafe', label: 'カフェ・コーヒーショップ' },
    { value: 'beauty', label: '美容院・ヘアサロン' },
    { value: 'restaurant', label: 'レストラン・飲食店' },
    { value: 'retail', label: '雑貨店・小売店' },
    { value: 'fitness', label: 'ジム・フィットネス' },
    { value: 'massage', label: '整体・マッサージ' },
    { value: 'clinic', label: 'クリニック・歯科' },
    { value: 'school', label: '塾・スクール' },
    { value: 'other', label: 'その他' }
  ]

  const challengeOptions = [
    { value: 'onetime', label: '一度来てそれっきりの客が多い' },
    { value: 'lowprice', label: '客単価が低い' },
    { value: 'competition', label: '競合に客を取られる' },
    { value: 'seasonal', label: '季節によって売上が不安定' },
    { value: 'newcustomer', label: '新規客ばかりでリピートがない' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.industry || !formData.service || !formData.challenge) {
      setError('全ての項目を入力してください')
      return
    }

    setIsGenerating(true)
    setError('')
    
    try {
      const response = await fetch('/api/trial-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (response.ok) {
        setGeneratedArticle(result)
      } else {
        setError(result.error || '記事生成に失敗しました')
      }
    } catch (error) {
      setError('記事生成中にエラーが発生しました')
    } finally {
      setIsGenerating(false)
    }
  }

  const resetForm = () => {
    setFormData({ industry: '', service: '', challenge: '' })
    setGeneratedArticle(null)
    setError('')
  }

  if (generatedArticle) {
    return (
      <div className="space-y-6">
        {/* 生成された記事 */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">生成された記事</h3>
            <button
              onClick={resetForm}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              別の記事を作成
            </button>
          </div>
          
          {/* タイトル */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-600 mb-2">記事タイトル</label>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="text-lg font-bold text-gray-800">{generatedArticle.title}</h4>
            </div>
          </div>

          {/* 記事本文 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-600 mb-2">記事本文</label>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
              <div 
                className="prose prose-gray max-w-none text-gray-800 whitespace-pre-line"
                dangerouslySetInnerHTML={{ __html: generatedArticle.content.replace(/\n/g, '<br>') }}
              />
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
            <h4 className="font-bold text-gray-800 mb-3">👆 この品質の記事をWordPressに自動投稿しませんか？</h4>
            <p className="text-gray-600 mb-4 text-sm">
              ・480種類以上の業界特化プロンプト<br/>
              ・WordPress自動投稿機能<br/>
              ・無制限記事生成
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = '/api/auth/signin'}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-colors text-sm"
              >
                無料でアカウント作成
              </button>
              <button
                onClick={() => window.location.href = '/pricing'}
                className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
              >
                プロンプトを見る
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 業界選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">業界・業種</label>
        <select
          value={formData.industry}
          onChange={(e) => setFormData({...formData, industry: e.target.value})}
          className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors bg-white"
          required
        >
          <option value="">業界を選択してください</option>
          {industryOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {/* サービス/商品 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">主なサービス・商品</label>
        <input
          type="text"
          value={formData.service}
          onChange={(e) => setFormData({...formData, service: e.target.value})}
          placeholder="例：ラテ、カット、マッサージ、パン"
          className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
          required
        />
      </div>

      {/* 課題 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">現在の課題</label>
        <select
          value={formData.challenge}
          onChange={(e) => setFormData({...formData, challenge: e.target.value})}
          className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors bg-white"
          required
        >
          <option value="">課題を選択してください</option>
          {challengeOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* 生成ボタン */}
      <button
        type="submit"
        disabled={isGenerating}
        className={`w-full py-4 text-white font-bold rounded-xl text-lg shadow-lg transform transition-all duration-200 ${
          isGenerating
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 hover:shadow-xl hover:-translate-y-0.5'
        }`}
      >
        {isGenerating ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
            記事を生成中...
          </div>
        ) : (
          '無料で記事を生成'
        )}
      </button>

      {/* 注意書き */}
      <p className="text-xs text-gray-500 text-center">
        ※ お試し機能は1日1回まで利用可能です
      </p>
    </form>
  )
}