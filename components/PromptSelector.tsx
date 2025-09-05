'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Prompt } from '@/lib/prompts'

interface PromptWithStatus extends Prompt {
  purchased?: boolean
  available?: boolean
}

interface PromptSelectorProps {
  selectedPrompt: string | null
  onPromptSelect: (promptId: string) => void
  onInputsChange: (inputs: Record<string, string>) => void
}

// 入力フィールドの日本語マッピング
const fieldLabels: Record<string, string> = {
  location: '地域・場所',
  company_feature: '会社の特徴',
  service_name: 'サービス名',
  product_name: '商品名',
  target_audience: 'ターゲット層',
  industry: '業界',
  company_name: '会社名',
  brand_name: 'ブランド名',
  price: '価格',
  features: '特徴・機能',
  benefits: 'メリット・効果',
  keyword: 'キーワード',
  topic: 'トピック・話題',
  theme: 'テーマ',
  genre: 'ジャンル',
  category: 'カテゴリー',
  title: 'タイトル',
  description: '説明',
  content: 'コンテンツ',
  problem: '課題・問題',
  solution: '解決策',
  goal: '目標',
  objective: '目的',
  method: '方法・手段',
  technique: '技術・テクニック',
  strategy: '戦略',
  approach: 'アプローチ',
  concept: 'コンセプト',
  idea: 'アイデア',
  plan: '計画',
  schedule: 'スケジュール',
  timeline: 'タイムライン',
  deadline: '締切',
  budget: '予算',
  cost: '費用',
  investment: '投資額',
  roi: 'ROI・投資収益率',
  kpi: 'KPI・重要指標',
  metric: '測定指標',
  data: 'データ',
  analytics: '分析結果',
  insight: '洞察・気づき',
  trend: 'トレンド',
  market: '市場',
  competition: '競合',
  competitor: '競合他社',
  advantage: '優位性',
  strength: '強み',
  weakness: '弱み',
  opportunity: '機会',
  threat: '脅威',
  risk: 'リスク',
  challenge: '課題',
  issue: '問題',
  concern: '懸念点',
  requirement: '要件',
  specification: '仕様',
  standard: '基準',
  criteria: '判断基準',
  evaluation: '評価',
  assessment: 'アセスメント',
  review: 'レビュー',
  feedback: 'フィードバック',
  comment: 'コメント',
  opinion: '意見',
  suggestion: '提案',
  recommendation: '推奨事項',
  advice: 'アドバイス',
  tip: 'コツ・ヒント',
  example: '例',
  case: 'ケース',
  scenario: 'シナリオ',
  situation: '状況',
  context: '文脈・背景',
  background: '背景',
  history: '履歴・経歴',
  experience: '経験',
  skill: 'スキル',
  expertise: '専門知識',
  knowledge: '知識',
  education: '教育',
  training: '研修・トレーニング',
  certification: '資格・認定',
  qualification: '資格',
  achievement: '実績・成果',
  accomplishment: '達成事項',
  success: '成功事例',
  failure: '失敗事例',
  lesson: '学び・教訓',
  best_practice: 'ベストプラクティス',
  guideline: 'ガイドライン',
  procedure: '手順',
  process: 'プロセス',
  workflow: 'ワークフロー',
  system: 'システム',
  tool: 'ツール',
  software: 'ソフトウェア',
  platform: 'プラットフォーム',
  technology: '技術',
  innovation: '革新・イノベーション',
  development: '開発',
  improvement: '改善',
  optimization: '最適化',
  efficiency: '効率性',
  productivity: '生産性',
  performance: 'パフォーマンス',
  quality: '品質',
  reliability: '信頼性',
  security: 'セキュリティ',
  safety: '安全性',
  compliance: 'コンプライアンス',
  regulation: '規制',
  law: '法律',
  policy: 'ポリシー',
  rule: 'ルール',
  standard_operating_procedure: '標準作業手順',
  manual: 'マニュアル',
  documentation: 'ドキュメント',
  report: 'レポート',
  presentation: 'プレゼンテーション',
  meeting: '会議',
  discussion: '議論',
  negotiation: '交渉',
  agreement: '合意',
  contract: '契約',
  deal: '取引',
  partnership: 'パートナーシップ',
  collaboration: '協力・連携',
  teamwork: 'チームワーク',
  communication: 'コミュニケーション',
  relationship: '関係性',
  network: 'ネットワーク',
  connection: 'つながり',
  contact: '連絡先',
  support: 'サポート',
  service: 'サービス',
  assistance: '支援・援助',
  help: 'ヘルプ',
  guidance: '指導・ガイダンス',
  mentoring: 'メンタリング',
  coaching: 'コーチング',
  consulting: 'コンサルティング',
  advisory: 'アドバイザリー',
  expertise_area: '専門分野',
  specialization: '専門特化',
  focus_area: '重点分野',
  core_business: '中核事業',
  main_service: '主要サービス',
  primary_product: '主力商品',
  flagship: 'フラッグシップ',
  signature: 'シグネチャー',
  unique_selling_point: 'USP・独自の価値提案',
  unique_value: '独自の価値・強み',
  value_proposition: '価値提案',
  case_type: 'ケースタイプ・事例種別',
  success_factor: '成功要因',
  customer_transformation: '顧客変革・成果',
  mission: 'ミッション',
  vision: 'ビジョン',
  values: '価値観',
  culture: '企業文化',
  philosophy: '理念・哲学',
  principle: '原則',
  belief: '信念',
  commitment: 'コミットメント',
  promise: '約束',
  guarantee: '保証',
  warranty: '保証期間',
  policy_detail: 'ポリシー詳細'
}

// 日本語ラベルを取得する関数
function getFieldLabel(field: string): string {
  return fieldLabels[field] || field
}

export default function PromptSelector({ selectedPrompt, onPromptSelect, onInputsChange }: PromptSelectorProps) {
  const [prompts, setPrompts] = useState<PromptWithStatus[]>([])
  const [groupedPrompts, setGroupedPrompts] = useState<Record<string, PromptWithStatus[]>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'available' | 'free' | 'purchased'>('available')
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all')
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [purchasing, setPurchasing] = useState<string | null>(null)

  useEffect(() => {
    fetchPrompts()
  }, [filter, selectedIndustry])

  const fetchPrompts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('filter', filter)
      if (selectedIndustry !== 'all') params.set('industry', selectedIndustry)

      const response = await fetch(`/api/prompts?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        console.log('Fetched prompts data:', data) // デバッグ用
        setPrompts(data.prompts || [])
        setGroupedPrompts(data.grouped || {})
      } else {
        console.error('Failed to fetch prompts:', data.error)
      }
    } catch (error) {
      console.error('Error fetching prompts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (key: string, value: string) => {
    const newInputs = { ...inputs, [key]: value }
    setInputs(newInputs)
    onInputsChange(newInputs)
  }

  const handlePurchase = async (promptId: string) => {
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

  const renderInputFields = () => {
    const prompt = prompts.find(p => p.prompt_id === selectedPrompt)
    if (!prompt) return null

    // プロンプトテンプレートから{key}を抽出
    const template = prompt.user_prompt_template
    const matches = template.match(/\{([^}]+)\}/g)
    if (!matches) return null

    const fields = matches.map(match => match.slice(1, -1)) // {key} → key

    return (
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-gray-800 mb-3">入力項目</h4>
        <div className="space-y-3">
          {fields.map(field => {
            const japaneseLabel = getFieldLabel(field)
            return (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {japaneseLabel}
                  {field !== japaneseLabel && (
                    <span className="ml-1 text-xs text-gray-500">({field})</span>
                  )}
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                  placeholder={`${japaneseLabel}を入力してください`}
                  value={inputs[field] || ''}
                  onChange={(e) => handleInputChange(field, e.target.value)}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* フィルター */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center justify-between w-full">
          <div className="text-lg font-semibold text-gray-800">利用可能プロンプト</div>
          <Link 
            href="/prompts" 
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-colors text-sm"
          >
            プロンプトを購入
          </Link>
        </div>

        <select 
          value={selectedIndustry}
          onChange={(e) => setSelectedIndustry(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
        >
          <option value="all">全業界</option>
          {groupedPrompts && Object.keys(groupedPrompts).map(industry => (
            <option key={industry} value={industry}>
              {getIndustryIcon(industry)} {getIndustryName(industry)}
            </option>
          ))}
        </select>
      </div>

      {/* プロンプト一覧 */}
      {groupedPrompts && Object.entries(groupedPrompts).map(([industry, industryPrompts]) => (
        <div key={industry} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <span className="text-xl">{getIndustryIcon(industry)}</span>
              {getIndustryName(industry)}
              <span className="text-sm text-gray-500">({industryPrompts.length}個)</span>
            </h3>
          </div>
          <div className="p-4 grid gap-3">
            {industryPrompts.map((prompt) => (
              <div 
                key={prompt.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedPrompt === prompt.prompt_id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${!prompt.available ? 'opacity-50' : ''}`}
                onClick={() => prompt.available && onPromptSelect(prompt.prompt_id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-800 flex-1">{prompt.name}</h4>
                  <div className="flex items-center gap-2 ml-4">
                    {prompt.is_free ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                        無料
                      </span>
                    ) : prompt.purchased ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                        購入済み
                      </span>
                    ) : (
                      <>
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                          ¥{prompt.price.toLocaleString()}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePurchase(prompt.prompt_id)
                          }}
                          disabled={purchasing === prompt.prompt_id}
                          className="px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {purchasing === prompt.prompt_id ? '処理中...' : '購入'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{prompt.description}</p>
                <div className="text-xs text-gray-500">
                  {prompt.purpose} / {prompt.format}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 入力フィールド */}
      {renderInputFields()}

      {prompts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">まだプロンプトを購入していません</h3>
          <p className="text-gray-500 mb-6">業界特化のプロフェッショナルプロンプトを購入して、高品質な記事生成を始めましょう。</p>
          <Link 
            href="/prompts"
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-colors"
          >
            プロンプトカタログを見る
          </Link>
        </div>
      )}
    </div>
  )
}