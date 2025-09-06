'use client'

import { useState } from 'react'

export default function TrialExperience() {
  const [keywords, setKeywords] = useState('')
  const [articleCount, setArticleCount] = useState(1)
  const [naturalizeHeadings, setNaturalizeHeadings] = useState(true)
  const [humanize, setHumanize] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedArticle, setGeneratedArticle] = useState<{title: string, content: string} | null>(null)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!keywords.trim()) {
      setError('キーワードを入力してください')
      return
    }

    setIsGenerating(true)
    setError('')
    
    try {
      // 簡易的な体験版用のAPI呼び出し
      const response = await fetch('/api/trial-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // デフォルト値で生成
          industry: 'other',
          service: keywords,
          challenge: 'service_quality',
          writerType: 'owner',
          readerType: 'prospect',
          goalType: 'attraction'
        })
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
    setKeywords('')
    setGeneratedArticle(null)
    setError('')
  }

  if (generatedArticle) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <h2 className="text-2xl font-semibold text-gray-800">生成結果</h2>
          </div>
          <button
            onClick={resetForm}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            別の記事を作成
          </button>
        </div>

        {/* 適用された機能の表示 */}
        <div className="mb-6 flex flex-wrap gap-2">
          <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
            panolabo AI エンジン v2.1.0
          </span>
          {naturalizeHeadings && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
              ✓ 見出し自動変換
            </span>
          )}
          {humanize && (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
              ✓ 人肌フィルタ
            </span>
          )}
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
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
      <div className="flex items-center mb-6">
        <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
        <h2 className="text-2xl font-semibold text-gray-800">記事生成</h2>
        <span className="text-xs text-gray-500 ml-2">(体験版)</span>
      </div>

      <div className="space-y-6">
        {/* panolabo AI エンジン説明 */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
            <img src="/panolabo-ai-icon.svg" alt="" className="w-5 h-5 mr-2" />
            panolabo AI エンジン
            <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">自動最適化</span>
          </h3>
          <p className="text-sm text-gray-600">
            AIが8つの要素を自動で最適化します。あなたはキーワードを入力するだけ。
          </p>
        </div>

        {/* キーワード入力 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            キーワード（業界・商品・サービス名など）
          </label>
          <input
            type="text"
            placeholder="例：不動産投資、美容サロン、ITコンサルティング"
            className="w-full p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
        </div>

        {/* 記事数 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">記事数</label>
          <select 
            className="w-full p-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors bg-white"
            value={articleCount}
            onChange={(e) => setArticleCount(Number(e.target.value))}
            disabled={true} // 体験版では1記事のみ
          >
            <option value={1}>1記事（体験版）</option>
          </select>
        </div>

        {/* 見出し自動変換設定 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={naturalizeHeadings}
              onChange={(e) => setNaturalizeHeadings(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-semibold text-blue-800">見出し自動変換</span>
              <div className="text-xs text-blue-600 mt-1">
                「What/How/Why」→「読者向け自然見出し」に自動変換<br/>
                例：「読者の抱える課題」→「こんな悩み、ありませんか？」
              </div>
            </div>
          </label>
        </div>

        {/* 人肌フィルタ設定 */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={humanize}
              onChange={(e) => setHumanize(e.target.checked)}
              className="mt-1 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <div>
              <span className="text-sm font-semibold text-green-800">人肌フィルタ</span>
              <div className="text-xs text-green-600 mt-1">
                AIっぽいフレーズを自然な表現に変換<br/>
                例：「本記事では」→「今日は」「解説します」→「話をしよう」
              </div>
            </div>
          </label>
        </div>

        {/* 投稿ステータス（体験版では選択不可） */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">投稿ステータス</label>
          <select 
            className="w-full p-4 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            disabled={true}
          >
            <option>体験版では利用できません</option>
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
          onClick={handleGenerate}
          disabled={isGenerating || !keywords.trim()}
          className={`w-full py-5 text-white font-bold rounded-xl text-lg shadow-lg transform transition-all duration-200 ${
            isGenerating || !keywords.trim()
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
            '1記事を生成（無料体験）'
          )}
        </button>
      </div>

      {/* 説明セクション */}
      <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
        <div className="flex items-start">
          <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2 mr-4"></div>
          <div className="text-sm text-gray-700 space-y-1">
            <p className="font-medium">🎯 体験版では1記事のみ生成可能です（1日1回まで）</p>
            <p>✨ 見出し自動変換・人肌フィルタを体験できます</p>
            <p>📝 ログイン後はWordPressへの自動投稿が可能</p>
            <p>📅 予約投稿で1ヶ月分の記事を自動分散投稿</p>
            <p>⚡ 生成には30秒～1分程度かかります</p>
          </div>
        </div>
      </div>
    </div>
  )
}