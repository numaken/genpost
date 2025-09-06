'use client'

import { useState } from 'react'

export default function TrialPromptForm() {
  const [formData, setFormData] = useState({
    industry: '',
    service: '',
    challenge: '',
    writerType: '',
    readerType: '',
    goalType: ''
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

  const getContentFocusOptions = (goalType: string) => {
    if (goalType === 'attraction' || goalType === 'experience') {
      // 見込み客向け - 伝えたいこと/読者のニーズ
      return [
        { value: 'service_quality', label: 'サービス・商品の品質の高さ' },
        { value: 'unique_value', label: '他では味わえない特別な体験' },
        { value: 'comfort_safety', label: '安心・快適な環境' },
        { value: 'personal_care', label: '一人ひとりへの丁寧な対応' },
        { value: 'accessibility', label: '気軽に利用しやすい雰囲気' }
      ]
    } else {
      // ビジネス向け - 解決したい課題
      return [
        { value: 'onetime', label: '一度来てそれっきりの客が多い' },
        { value: 'lowprice', label: '客単価が低い' },
        { value: 'competition', label: '競合に客を取られる' },
        { value: 'seasonal', label: '季節によって売上が不安定' },
        { value: 'newcustomer', label: '新規客ばかりでリピートがない' }
      ]
    }
  }

  const writerTypeOptions = [
    { value: 'owner', label: '現役の経営者・オーナー（実体験ベース）' },
    { value: 'consultant', label: '業界専門コンサルタント（専門知識ベース）' },
    { value: 'expert', label: 'サービス提供の専門家（技術・スキルベース）' }
  ]

  const readerTypeOptions = [
    { value: 'prospect', label: 'サービス利用を検討している見込み客' },
    { value: 'peer', label: '同業界の経営者・事業者' },
    { value: 'beginner', label: 'これから開業・参入予定の人' }
  ]

  const goalTypeOptions = [
    { value: 'attraction', label: '魅力発信（お店・サービスの魅力を伝えて来店を促す）' },
    { value: 'experience', label: '体験価値（利用体験の素晴らしさを伝える）' },
    { value: 'education', label: '情報提供（読者に役立つ知識・情報を提供）' },
    { value: 'acquisition', label: 'リード獲得（相談・問い合わせにつなげる）' },
    { value: 'sharing', label: 'ノウハウ共有（同業者向けの知識・経験の共有）' },
    { value: 'branding', label: 'ブランディング（専門性・信頼性のアピール）' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.industry || !formData.service || !formData.challenge || 
        !formData.writerType || !formData.readerType || !formData.goalType) {
      setError('全ての項目を選択してください')
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
    setFormData({ industry: '', service: '', challenge: '', writerType: '', readerType: '', goalType: '' })
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
          
          {/* 適用された機能の表示 */}
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
              panolabo AI エンジン v2.1.0
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
              ✓ 声質プロンプト適用
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
              ✓ 人肌フィルタ適用
            </span>
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
              ・panolabo AI エンジンの8要素自動最適化<br/>
              ・WordPress自動投稿機能<br/>
              ・見出し自然化 + 人肌フィルタ搭載
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
                料金プランを見る
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

      {/* 記事の焦点（目的に応じて動的変更） */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {formData.goalType === 'attraction' || formData.goalType === 'experience' 
            ? '記事で伝えたいポイント' 
            : '解決したい課題'}
        </label>
        <select
          value={formData.challenge}
          onChange={(e) => setFormData({...formData, challenge: e.target.value})}
          className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors bg-white"
          required
        >
          <option value="">
            {formData.goalType === 'attraction' || formData.goalType === 'experience' 
              ? 'アピールポイントを選択してください' 
              : '課題を選択してください'}
          </option>
          {getContentFocusOptions(formData.goalType).map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {/* 記事設定セクション */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-4">記事の設定</h4>
        
        {/* 書き手のタイプ */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">あなたの立場</label>
          <select
            value={formData.writerType}
            onChange={(e) => setFormData({...formData, writerType: e.target.value})}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors bg-white text-sm"
            required
          >
            <option value="">立場を選択してください</option>
            {writerTypeOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {/* 読者のタイプ */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">記事の読者</label>
          <select
            value={formData.readerType}
            onChange={(e) => setFormData({...formData, readerType: e.target.value})}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors bg-white text-sm"
            required
          >
            <option value="">読者を選択してください</option>
            {readerTypeOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {/* 記事の目的 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">記事の目的</label>
          <select
            value={formData.goalType}
            onChange={(e) => setFormData({...formData, goalType: e.target.value, challenge: ''})}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors bg-white text-sm"
            required
          >
            <option value="">目的を選択してください</option>
            {goalTypeOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* 適用される機能の説明 */}
      <div className="bg-gradient-to-r from-purple-50 to-green-50 rounded-lg p-4 border border-purple-200">
        <div className="text-sm font-medium text-gray-700 mb-2">自動適用される機能：</div>
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-white text-purple-700 text-xs rounded border border-purple-300">
            8要素自動最適化
          </span>
          <span className="px-2 py-1 bg-white text-green-700 text-xs rounded border border-green-300">
            声質プロンプト
          </span>
          <span className="px-2 py-1 bg-white text-green-700 text-xs rounded border border-green-300">
            人肌フィルタ
          </span>
        </div>
      </div>

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
        ※ お試し機能は1日1回まで利用可能です（開発環境では無制限）
      </p>
    </form>
  )
}