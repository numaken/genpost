// lib/packSystem.ts - Pack販売システム（プロンプトの進化版）

import { createClient } from '@supabase/supabase-js'
import { VerticalKey } from './headingMapByVertical'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Pack構成要素の型定義
 */
export interface PackAssets {
  voice?: {
    system: string
    temperature?: number
    maxTokens?: number
  }
  heading?: {
    map: Record<string, string>
    vertical?: VerticalKey
  }
  humanize?: {
    rules: [string, string][]
    excludePatterns?: string[]
    useLLM?: boolean
  }
  flow?: {
    critiqueRubric: string
    reviseInstruction: string
    skipThreshold?: number
  }
  rag?: {
    dataSource: string
    embeddings?: string[]
    context?: string
  }
  meta?: {
    schemaOrg?: boolean
    structuredData?: object
    seoBoost?: boolean
  }
}

/**
 * Pack商品の型定義
 */
export interface Pack {
  id: string
  name: string
  description: string
  type: 'voice' | 'heading' | 'humanize' | 'flow' | 'rag' | 'complete'
  vertical?: VerticalKey
  version: number
  price: number
  isActive: boolean
  assets: PackAssets
  createdAt: string
  updatedAt: string
}

/**
 * ユーザーのPack購入権の型定義
 */
export interface PackEntitlement {
  userId: string
  packId: string
  plan: 'trial' | 'basic' | 'pro' | 'enterprise'
  startedAt: string
  endsAt: string | null // nullは買い切り
  isActive: boolean
}

/**
 * Pack商品の一覧取得
 */
export async function getAvailablePacks(
  userId?: string,
  vertical?: VerticalKey
): Promise<Pack[]> {
  let query = supabase
    .from('packs')
    .select('*')
    .eq('isActive', true)
    .order('created_at', { ascending: false })

  if (vertical) {
    query = query.or(`vertical.eq.${vertical},vertical.is.null`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Pack fetch error:', error)
    return []
  }

  return data || []
}

/**
 * ユーザーの購入済みPack一覧取得
 */
export async function getUserPacks(userId: string): Promise<Pack[]> {
  const { data: entitlements, error: entitlementError } = await supabase
    .from('pack_entitlements')
    .select(`
      *,
      packs (*)
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .or('ends_at.is.null,ends_at.gt.now()')

  if (entitlementError) {
    console.error('User pack fetch error:', entitlementError)
    return []
  }

  return entitlements?.map(e => e.packs).filter(Boolean) || []
}

/**
 * Pack購入権限チェック
 */
export async function checkPackEntitlement(
  userId: string,
  packId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('pack_entitlements')
    .select('*')
    .eq('user_id', userId)
    .eq('pack_id', packId)
    .eq('is_active', true)
    .or('ends_at.is.null,ends_at.gt.now()')
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error('Pack entitlement check error:', error)
    return false
  }

  return !!data
}

/**
 * 特定のPackを取得（購入権限チェック付き）
 */
export async function getEntitledPack(
  userId: string,
  packId: string
): Promise<Pack | null> {
  const hasEntitlement = await checkPackEntitlement(userId, packId)
  
  if (!hasEntitlement) {
    return null
  }

  const { data, error } = await supabase
    .from('packs')
    .select('*')
    .eq('id', packId)
    .eq('is_active', true)
    .single()

  if (error) {
    console.error('Pack fetch error:', error)
    return null
  }

  return data
}

/**
 * Pack購入権の作成（Stripe決済後に呼び出し）
 */
export async function createPackEntitlement(
  userId: string,
  packId: string,
  plan: PackEntitlement['plan'] = 'basic',
  durationDays?: number
): Promise<void> {
  const endsAt = durationDays 
    ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
    : null

  const { error } = await supabase
    .from('pack_entitlements')
    .upsert({
      user_id: userId,
      pack_id: packId,
      plan: plan,
      started_at: new Date().toISOString(),
      ends_at: endsAt,
      is_active: true
    })

  if (error) {
    console.error('Pack entitlement creation error:', error)
    throw new Error('Pack購入権の作成に失敗しました')
  }
}

/**
 * Pack使用統計の記録
 */
export async function recordPackUsage(
  userId: string,
  packId: string,
  usage: {
    generatedArticles: number
    wordsGenerated: number
    features: string[]
    timestamp: string
  }
): Promise<void> {
  const { error } = await supabase
    .from('pack_usage_stats')
    .insert({
      user_id: userId,
      pack_id: packId,
      generated_articles: usage.generatedArticles,
      words_generated: usage.wordsGenerated,
      features_used: usage.features,
      used_at: usage.timestamp
    })

  if (error) {
    console.error('Pack usage recording error:', error)
  }
}

/**
 * 既存のプロンプトDBからのPack移行用ヘルパー
 */
export async function migratePromptToPack(
  promptId: string,
  packData: {
    name: string
    description: string
    price: number
    vertical?: VerticalKey
    assets: PackAssets
  }
): Promise<string> {
  const packId = `migrated-${promptId}-v1`
  
  const { data, error } = await supabase
    .from('packs')
    .upsert({
      id: packId,
      name: packData.name,
      description: packData.description,
      type: 'complete',
      vertical: packData.vertical,
      version: 1,
      price: packData.price,
      is_active: true,
      assets: packData.assets,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Pack migration error:', error)
    throw new Error('Pack移行に失敗しました')
  }

  return data.id
}