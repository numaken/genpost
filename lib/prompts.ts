import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface Prompt {
  id: string
  prompt_id: string
  industry: string
  purpose: string
  format: string
  name: string
  description: string
  price: number
  is_free: boolean
  system_prompt: string
  user_prompt_template: string
  gen_config: any
  is_active: boolean
  created_at: string
  updated_at: string
}

// 全プロンプト取得
export async function getAllPrompts(): Promise<Prompt[]> {
  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('is_active', true)
    .order('industry, purpose, format')
  
  if (error) throw error
  return data || []
}

// プロンプトID指定取得
export async function getPromptById(promptId: string): Promise<Prompt | null> {
  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('prompt_id', promptId)
    .eq('is_active', true)
    .single()
  
  if (error) {
    console.error('Prompt not found:', error)
    return null
  }
  return data
}

// 業界別プロンプト取得
export async function getPromptsByIndustry(industry: string): Promise<Prompt[]> {
  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('industry', industry)
    .eq('is_active', true)
    .order('purpose, format')
  
  if (error) throw error
  return data || []
}

// 無料プロンプト取得
export async function getFreePrompts(): Promise<Prompt[]> {
  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('is_free', true)
    .eq('is_active', true)
    .order('industry, purpose')
  
  if (error) throw error
  return data || []
}

// ユーザーのプロンプト購入確認
export async function hasUserPurchased(userId: string, promptId: string): Promise<boolean> {
  // まず無料プロンプトかチェック
  const prompt = await getPromptById(promptId)
  if (!prompt) return false
  if (prompt.is_free) return true
  
  // 購入履歴をチェック
  const { data, error } = await supabase
    .from('user_prompts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('prompt_id', promptId)
  
  if (error) {
    console.error('Purchase check error:', error)
    return false
  }
  
  return data && data.length > 0
}

// プロンプト購入記録
export async function purchasePrompt(userId: string, promptId: string) {
  const prompt = await getPromptById(promptId)
  if (!prompt) throw new Error('プロンプトが見つかりません')
  
  const { data, error } = await supabase
    .from('user_prompts')
    .insert({
      user_id: userId,
      prompt_id: prompt.id,
      purchased_at: new Date().toISOString(),
      is_active: true
    })
  
  if (error) throw error
  return data
}

// プロンプト使用履歴記録
export async function recordPromptUsage(userId: string, promptId: string) {
  const prompt = await getPromptById(promptId)
  if (!prompt) throw new Error('プロンプトが見つかりません')
  
  const { data, error } = await supabase
    .from('prompt_usage')
    .insert({
      user_id: userId,
      prompt_id: prompt.id,
      generated_article_count: 1,
      usage_date: new Date().toISOString()
    })
  
  if (error) throw error
  return data
}

// プロンプトテンプレート処理
export function processPromptTemplate(template: string, inputs: Record<string, string>): string {
  let processed = template
  
  // {key} を inputs[key] で置換
  Object.entries(inputs).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g')
    processed = processed.replace(regex, value)
  })
  
  return processed
}