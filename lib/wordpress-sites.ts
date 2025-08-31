import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface WordPressSite {
  id: string
  user_email: string
  site_name: string
  site_url: string
  wp_username: string
  wp_app_password: string
  default_category_id: number
  selected_prompt_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserSiteLimit {
  id: string
  user_email: string
  max_sites: number
  is_unlimited: boolean
  unlimited_expires_at?: string
  created_at: string
  updated_at: string
}

// ユーザーのWordPressサイト一覧取得
export async function getUserWordPressSites(userEmail: string): Promise<WordPressSite[]> {
  const { data, error } = await supabase
    .from('wordpress_sites')
    .select('*')
    .eq('user_email', userEmail)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching WordPress sites:', error)
    throw new Error('サイト取得に失敗しました')
  }

  return data || []
}

// ユーザーのサイト制限情報取得
export async function getUserSiteLimit(userEmail: string): Promise<UserSiteLimit> {
  // まず既存の制限を確認
  const { data, error } = await supabase
    .from('user_site_limits')
    .select('*')
    .eq('user_email', userEmail)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error('Error fetching site limits:', error)
    throw new Error('サイト制限情報の取得に失敗しました')
  }

  // データがない場合は初期データを作成
  if (!data) {
    const { data: newLimit, error: insertError } = await supabase
      .from('user_site_limits')
      .insert({
        user_email: userEmail,
        max_sites: 2,
        is_unlimited: false
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating site limits:', insertError)
      throw new Error('サイト制限情報の作成に失敗しました')
    }

    return newLimit
  }

  return data
}

// WordPress サイト追加
export async function addWordPressSite(
  userEmail: string,
  siteData: {
    site_name: string
    site_url: string
    wp_username: string
    wp_app_password: string
    default_category_id?: number
  }
): Promise<WordPressSite> {
  // サイト制限チェック
  const siteLimit = await getUserSiteLimit(userEmail)
  const currentSites = await getUserWordPressSites(userEmail)

  if (!siteLimit.is_unlimited && currentSites.length >= siteLimit.max_sites) {
    throw new Error(`サイト登録数の上限（${siteLimit.max_sites}サイト）に達しています。無制限プランをご利用ください。`)
  }

  // 同じURLのサイトが既に存在するかチェック
  const existingSite = currentSites.find(site => site.site_url === siteData.site_url)
  if (existingSite) {
    throw new Error('このサイトURLは既に登録されています')
  }

  const { data, error } = await supabase
    .from('wordpress_sites')
    .insert({
      user_email: userEmail,
      site_name: siteData.site_name,
      site_url: siteData.site_url.replace(/\/$/, ''), // 末尾のスラッシュを除去
      wp_username: siteData.wp_username,
      wp_app_password: siteData.wp_app_password,
      default_category_id: siteData.default_category_id || 1
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding WordPress site:', error)
    throw new Error('サイトの追加に失敗しました')
  }

  return data
}

// WordPress サイト更新
export async function updateWordPressSite(
  userEmail: string,
  siteId: string,
  updateData: Partial<{
    site_name: string
    site_url: string
    wp_username: string
    wp_app_password: string
    default_category_id: number
  }>
): Promise<WordPressSite> {
  const { data, error } = await supabase
    .from('wordpress_sites')
    .update({
      ...updateData,
      updated_at: new Date().toISOString()
    })
    .eq('id', siteId)
    .eq('user_email', userEmail)
    .select()
    .single()

  if (error) {
    console.error('Error updating WordPress site:', error)
    throw new Error('サイト情報の更新に失敗しました')
  }

  return data
}

// WordPress サイト削除（論理削除）
export async function deleteWordPressSite(userEmail: string, siteId: string): Promise<void> {
  const { error } = await supabase
    .from('wordpress_sites')
    .update({
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', siteId)
    .eq('user_email', userEmail)

  if (error) {
    console.error('Error deleting WordPress site:', error)
    throw new Error('サイトの削除に失敗しました')
  }
}

// 無制限プラン購入用Stripe セッション作成
export async function createUnlimitedSitePurchase(userEmail: string) {
  const { data, error } = await supabase
    .from('unlimited_site_purchases')
    .insert({
      user_email: userEmail,
      amount: 2980, // 年額2,980円
      duration_months: 12,
      status: 'pending',
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1年後
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating unlimited site purchase:', error)
    throw new Error('購入情報の作成に失敗しました')
  }

  return data
}

// 無制限プラン購入完了処理
export async function completeUnlimitedSitePurchase(
  userEmail: string,
  stripeSessionId: string,
  paymentIntentId: string
): Promise<void> {
  // トランザクション開始
  const { error: purchaseError } = await supabase
    .from('unlimited_site_purchases')
    .update({
      stripe_session_id: stripeSessionId,
      stripe_payment_intent_id: paymentIntentId,
      status: 'completed'
    })
    .eq('user_email', userEmail)
    .eq('status', 'pending')

  if (purchaseError) {
    console.error('Error updating purchase:', purchaseError)
    throw new Error('購入完了処理に失敗しました')
  }

  // ユーザーのサイト制限を無制限に更新
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
  
  const { error: limitError } = await supabase
    .from('user_site_limits')
    .upsert({
      user_email: userEmail,
      max_sites: 999,
      is_unlimited: true,
      unlimited_expires_at: expiresAt,
      updated_at: new Date().toISOString()
    })

  if (limitError) {
    console.error('Error updating site limits:', limitError)
    throw new Error('サイト制限の更新に失敗しました')
  }
}