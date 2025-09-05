'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MessageContractWithStatus } from '@/lib/message-contracts'
import { PromptEngine } from '@/lib/prompt-engine'

interface ContractSelectorProps {
  selectedContract: string | null
  onContractSelect: (contractId: string) => void
  onInputsChange: (inputs: Record<string, string>) => void
}

export default function ContractSelector({ 
  selectedContract, 
  onContractSelect, 
  onInputsChange 
}: ContractSelectorProps) {
  const [contracts, setContracts] = useState<MessageContractWithStatus[]>([])
  const [groupedContracts, setGroupedContracts] = useState<Record<string, MessageContractWithStatus[]>>({})
  const [loading, setLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [purchasing, setPurchasing] = useState<string | null>(null)

  useEffect(() => {
    fetchContracts()
  }, [selectedRole])

  const fetchContracts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedRole !== 'all') params.set('role', selectedRole)

      const response = await fetch(`/api/contracts?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        console.log('Fetched contracts data:', data)
        setContracts(data.contracts || [])
        setGroupedContracts(data.grouped || {})
      } else {
        console.error('Failed to fetch contracts:', data.error)
      }
    } catch (error) {
      console.error('Error fetching contracts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (key: string, value: string) => {
    const newInputs = { ...inputs, [key]: value }
    setInputs(newInputs)
    onInputsChange(newInputs)
  }

  const handlePurchase = async (contractId: string) => {
    try {
      setPurchasing(contractId)
      // TODO: Implement contract purchase
      alert('購入機能は実装中です')
    } catch (error) {
      alert('購入処理中にエラーが発生しました')
    } finally {
      setPurchasing(null)
    }
  }

  const getRoleIcon = (role: string) => {
    const icons: Record<string, string> = {
      '飲食店経営コンサルタント': '🍽️',
      'Webマーケター': '💻',
      '不動産アドバイザー': '🏠',
      'ITコンサルタント': '⚡',
      '美容・健康アドバイザー': '💄',
      'その他': '📄'
    }
    return icons[role] || '📄'
  }

  const renderInputFields = () => {
    const contract = contracts.find(c => c.contract_id === selectedContract)
    if (!contract || !contract.available) return null

    const requiredInputs = PromptEngine.extractRequiredInputs(contract)
    if (requiredInputs.length === 0) return null

    return (
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-gray-800 mb-3">記事カスタマイズ項目</h4>
        <div className="space-y-3">
          {requiredInputs.map(field => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field}
                <span className="ml-1 text-red-500">*</span>
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
        <div className="mt-3 p-3 bg-blue-100 rounded text-sm text-blue-800">
          <p><strong>💡 このテンプレートの特徴:</strong></p>
          <p>• 発信者: {contract.speaker.role} ({contract.speaker.brand})</p>
          <p>• 対象: {contract.audience.persona}</p>
          <p>• 主な価値: {contract.benefit.outcome[0]?.replace(/\{\{.*?\}\}/g, '[カスタマイズ]')}</p>
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
      {/* Header */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center justify-between w-full">
          <div className="text-lg font-semibold text-gray-800">記事テンプレート選択</div>
          <Link 
            href="/contracts" 
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-colors text-sm"
          >
            テンプレートを購入
          </Link>
        </div>

        <select 
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
        >
          <option value="all">すべての専門分野</option>
          {groupedContracts && Object.keys(groupedContracts).map(role => (
            <option key={role} value={role}>
              {getRoleIcon(role)} {role}
            </option>
          ))}
        </select>
      </div>

      {/* Contract List */}
      {groupedContracts && Object.entries(groupedContracts).map(([role, roleContracts]) => (
        <div key={role} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <span className="text-xl">{getRoleIcon(role)}</span>
              {role}
              <span className="text-sm text-gray-500">({roleContracts.length}個)</span>
            </h3>
          </div>
          <div className="p-4 grid gap-3">
            {roleContracts.map((contract) => (
              <div 
                key={contract.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedContract === contract.contract_id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${!contract.available ? 'opacity-50' : ''}`}
                onClick={() => contract.available && onContractSelect(contract.contract_id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-800 flex-1">{contract.name}</h4>
                  <div className="flex items-center gap-2 ml-4">
                    {contract.is_free ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                        無料
                      </span>
                    ) : contract.purchased ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                        購入済み
                      </span>
                    ) : (
                      <>
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                          ¥{contract.price.toLocaleString()}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePurchase(contract.contract_id)
                          }}
                          disabled={purchasing === contract.contract_id}
                          className="px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {purchasing === contract.contract_id ? '処理中...' : '購入'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 mb-2">
                  <p><strong>主張:</strong> {contract.claim.headline.replace(/\{\{.*?\}\}/g, '[カスタマイズ]')}</p>
                  <p><strong>対象:</strong> {contract.audience.persona}</p>
                </div>
                
                <div className="text-xs text-gray-500 flex flex-wrap gap-2">
                  <span>📊 検証スコア付き</span>
                  <span>🎯 4W1B構造</span>
                  <span>⚡ 自動最適化</span>
                  {contract.constraints.required_elements.length > 0 && (
                    <span>✨ {contract.constraints.required_elements.length}つの必須要素</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Input Fields */}
      {renderInputFields()}

      {/* Empty State */}
      {contracts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">テンプレートがありません</h3>
          <p className="text-gray-500 mb-6">専門性の高い記事テンプレートを購入して、価値ある記事を生成しましょう。</p>
          <Link 
            href="/contracts"
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-colors"
          >
            テンプレートカタログを見る
          </Link>
        </div>
      )}
    </div>
  )
}