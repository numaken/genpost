// components/PackSelector.tsx - Pack選択・購入UI

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Pack, PackEntitlement } from '@/lib/packSystem'

interface PackSelectorProps {
  onPackSelect: (packId: string | null) => void
  selectedPackId?: string | null
  vertical?: string
  className?: string
}

interface UserPack extends Pack {
  isOwned: boolean
  entitlement?: PackEntitlement
}

export default function PackSelector({
  onPackSelect,
  selectedPackId,
  vertical,
  className = ''
}: PackSelectorProps) {
  const { data: session } = useSession()
  const [packs, setPacks] = useState<UserPack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPacks()
  }, [vertical, session])

  const loadPacks = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/packs?vertical=${vertical || ''}`)
      const data = await response.json()
      
      if (response.ok) {
        setPacks(data.packs || [])
      } else {
        setError(data.error || 'Pack一覧の取得に失敗しました')
      }
    } catch (err) {
      setError('Pack一覧の取得に失敗しました')
      console.error('Pack load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePackPurchase = async (packId: string) => {
    if (!session) {
      alert('ログインが必要です')
      return
    }

    try {
      // Stripe決済フローを開始
      const response = await fetch('/api/purchase-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId })
      })
      
      const data = await response.json()
      
      if (response.ok && data.checkoutUrl) {
        // Stripe Checkoutにリダイレクト
        window.location.href = data.checkoutUrl
      } else {
        alert(data.error || '購入処理に失敗しました')
      }
    } catch (err) {
      alert('購入処理でエラーが発生しました')
      console.error('Purchase error:', err)
    }
  }

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-gray-200 rounded-lg h-64"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-red-600 text-center p-4 ${className}`}>
        <p>{error}</p>
        <button 
          onClick={loadPacks}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          再読み込み
        </button>
      </div>
    )
  }

  const freePacks = packs.filter(p => p.price === 0 || p.isOwned)
  const paidPacks = packs.filter(p => p.price > 0 && !p.isOwned)

  return (
    <div className={className}>
      {/* Pack選択なし（デフォルト）オプション */}
      <div className="mb-6">
        <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="radio"
            name="pack"
            checked={selectedPackId === null}
            onChange={() => onPackSelect(null)}
            className="mr-3"
          />
          <div>
            <div className="font-semibold text-gray-800">標準エンジン</div>
            <div className="text-sm text-gray-600">
              panolabo AI v2.1 標準機能（無料）
            </div>
          </div>
        </label>
      </div>

      {/* 無料・所有済みPack */}
      {freePacks.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm mr-2">
              利用可能
            </span>
            無料・所有済み Pack
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {freePacks.map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                isSelected={selectedPackId === pack.id}
                onSelect={onPackSelect}
                onPurchase={handlePackPurchase}
              />
            ))}
          </div>
        </div>
      )}

      {/* 有料Pack */}
      {paidPacks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm mr-2">
              購入可能
            </span>
            プレミアム Pack
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paidPacks.map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                isSelected={selectedPackId === pack.id}
                onSelect={onPackSelect}
                onPurchase={handlePackPurchase}
              />
            ))}
          </div>
        </div>
      )}

      {packs.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          利用可能なPackがありません
        </div>
      )}
    </div>
  )
}

/**
 * 個別Pack表示カード
 */
function PackCard({ 
  pack, 
  isSelected, 
  onSelect, 
  onPurchase 
}: {
  pack: UserPack
  isSelected: boolean
  onSelect: (packId: string) => void
  onPurchase: (packId: string) => void
}) {
  const isOwned = pack.isOwned || pack.price === 0

  return (
    <div className={`
      border rounded-lg p-4 transition-all duration-200
      ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
      ${isOwned ? '' : 'opacity-75'}
    `}>
      {/* Pack情報 */}
      <div className="mb-3">
        <div className="flex items-start justify-between">
          <h4 className="font-semibold text-gray-800 text-sm leading-tight">{pack.name}</h4>
          {pack.vertical && (
            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
              {pack.vertical}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
          {pack.description}
        </p>
      </div>

      {/* Pack機能一覧 */}
      <div className="mb-3">
        <div className="text-xs text-gray-500 mb-1">含まれる機能:</div>
        <div className="flex flex-wrap gap-1">
          {pack.assets.voice && (
            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
              ボイス
            </span>
          )}
          {pack.assets.heading && (
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
              見出し
            </span>
          )}
          {pack.assets.humanize && (
            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">
              人肌化
            </span>
          )}
          {pack.assets.flow && (
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
              フロー
            </span>
          )}
          {pack.assets.meta?.schemaOrg && (
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
              SEO
            </span>
          )}
        </div>
      </div>

      {/* 価格・操作 */}
      <div className="flex items-center justify-between">
        <div className="text-lg font-bold text-gray-800">
          {pack.price === 0 ? '無料' : `¥${pack.price.toLocaleString()}`}
        </div>
        
        <div className="flex gap-2">
          {isOwned ? (
            <button
              onClick={() => onSelect(pack.id)}
              className={`
                px-3 py-1 rounded text-sm font-medium transition-colors
                ${isSelected 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {isSelected ? '選択中' : '選択'}
            </button>
          ) : (
            <button
              onClick={() => onPurchase(pack.id)}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600 transition-colors"
            >
              購入
            </button>
          )}
        </div>
      </div>
    </div>
  )
}