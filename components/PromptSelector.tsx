'use client'

import { useState, useEffect } from 'react'
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

export default function PromptSelector({ selectedPrompt, onPromptSelect, onInputsChange }: PromptSelectorProps) {
  const [prompts, setPrompts] = useState<PromptWithStatus[]>([])
  const [groupedPrompts, setGroupedPrompts] = useState<Record<string, PromptWithStatus[]>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'available' | 'free' | 'purchased'>('all')
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
        setPrompts(data.prompts)
        setGroupedPrompts(data.grouped)
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
          {fields.map(field => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field}
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                placeholder={`${field}を入力してください`}
                value={inputs[field] || ''}
                onChange={(e) => handleInputChange(field, e.target.value)}
              />
            </div>
          ))}
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
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
        >
          <option value="all">すべてのプロンプト</option>
          <option value="purchased">購入済みプロンプト</option>
        </select>

        <select 
          value={selectedIndustry}
          onChange={(e) => setSelectedIndustry(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
        >
          <option value="all">全業界</option>
          {Object.keys(groupedPrompts).map(industry => (
            <option key={industry} value={industry}>
              {getIndustryIcon(industry)} {getIndustryName(industry)}
            </option>
          ))}
        </select>
      </div>

      {/* プロンプト一覧 */}
      {Object.entries(groupedPrompts).map(([industry, industryPrompts]) => (
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
        <div className="text-center py-8 text-gray-500">
          条件に一致するプロンプトがありません
        </div>
      )}
    </div>
  )
}