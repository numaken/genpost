import { createClient } from '@supabase/supabase-js'
import CryptoJS from 'crypto-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 暗号化キー（環境変数から必須取得）
const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_SECRET

// セキュリティチェック：暗号化キーが必須
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 16) {
  throw new Error('API_KEY_ENCRYPTION_SECRET is required and must be >=16 chars')
}

// APIキーを暗号化
function encryptApiKey(apiKey: string): string {
  return CryptoJS.AES.encrypt(apiKey, ENCRYPTION_KEY!).toString()
}

// APIキーを復号化
function decryptApiKey(encryptedApiKey: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedApiKey, ENCRYPTION_KEY!)
  return bytes.toString(CryptoJS.enc.Utf8)
}

// ユーザーのAPIキーを保存
export async function saveUserApiKey(userId: string, service: string, apiKey: string) {
  const encryptedKey = encryptApiKey(apiKey)
  
  const { data, error } = await supabase
    .from('user_api_keys')
    .upsert({
      user_id: userId,
      service: service,
      encrypted_api_key: encryptedKey,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,service' })
  
  if (error) throw error
  return data
}

// ユーザーのAPIキーを取得
export async function getUserApiKey(userId: string, service: string = 'openai'): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_api_keys')
    .select('encrypted_api_key')
    .eq('user_id', userId)
    .eq('service', service)
    .eq('is_active', true)
    .single()
  
  if (error || !data) return null
  
  try {
    return decryptApiKey(data.encrypted_api_key)
  } catch (decryptError) {
    console.error('API key decryption failed:', decryptError)
    return null
  }
}

// ユーザーのAPIキーを削除
export async function deleteUserApiKey(userId: string, service: string = 'openai') {
  const { error } = await supabase
    .from('user_api_keys')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('service', service)
  
  if (error) throw error
}

// APIキーが設定されているかチェック
export async function hasUserApiKey(userId: string, service: string = 'openai'): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_api_keys')
    .select('id')
    .eq('user_id', userId)
    .eq('service', service)
    .eq('is_active', true)
    .single()
  
  return !error && !!data
}

// 使用するAPIキーを決定（ユーザーキー優先、なければデフォルト）
export async function getEffectiveApiKey(userId: string): Promise<string> {
  // まずユーザーのAPIキーを確認
  const userKey = await getUserApiKey(userId, 'openai')
  if (userKey) {
    return userKey
  }
  
  // ユーザーキーがなければデフォルトキーを使用
  const defaultKey = process.env.OPENAI_API_KEY
  if (!defaultKey) {
    throw new Error('OpenAI API key not configured')
  }
  
  return defaultKey
}