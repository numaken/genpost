import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    const userEmail = session.user.email

    // 全プロンプトを取得
    const { data: allPrompts, error: allPromptsError } = await supabase
      .from('prompts')
      .select('id, prompt_id, name, user_prompt_template, industry')
      .eq('is_active', true)

    if (allPromptsError) {
      throw allPromptsError
    }

    // ユーザーの購入済みプロンプトを取得
    const { data: userPrompts, error: userPromptsError } = await supabase
      .from('user_prompts')
      .select('prompt_id')
      .eq('user_id', userEmail)
      .eq('is_active', true)

    const purchasedPromptIds = userPrompts?.map(p => p.prompt_id) || []

    // フィールド分析
    const fieldAnalysis: Record<string, {
      count: number
      prompts: string[]
      purchased: boolean
    }> = {}

    allPrompts?.forEach(prompt => {
      if (!prompt.user_prompt_template) return

      // {field} パターンを抽出
      const matches = prompt.user_prompt_template.match(/\{([^}]+)\}/g) || []
      const fields = matches.map((match: string) => match.slice(1, -1)) // {key} → key

      const isPurchased = purchasedPromptIds.includes(prompt.id)

      fields.forEach((field: string) => {
        if (!fieldAnalysis[field]) {
          fieldAnalysis[field] = {
            count: 0,
            prompts: [],
            purchased: false
          }
        }
        
        fieldAnalysis[field].count += 1
        fieldAnalysis[field].prompts.push(`${prompt.name} (${prompt.industry})`)
        
        if (isPurchased) {
          fieldAnalysis[field].purchased = true
        }
      })
    })

    // 購入済みプロンプトで使用されるフィールドを優先してソート
    const sortedFields = Object.entries(fieldAnalysis)
      .sort((a, b) => {
        if (a[1].purchased && !b[1].purchased) return -1
        if (!a[1].purchased && b[1].purchased) return 1
        return b[1].count - a[1].count
      })

    return NextResponse.json({
      analysis: {
        totalPrompts: allPrompts?.length || 0,
        totalFields: Object.keys(fieldAnalysis).length,
        purchasedPromptsCount: purchasedPromptIds.length,
        fieldAnalysis: Object.fromEntries(sortedFields)
      },
      purchasedFields: Object.entries(fieldAnalysis)
        .filter(([_, data]) => data.purchased)
        .map(([field, data]) => ({
          field,
          count: data.count,
          prompts: data.prompts.slice(0, 3) // 最初の3つだけ表示
        }))
    })

  } catch (error) {
    console.error('Prompt fields analysis error:', error)
    return NextResponse.json({ 
      error: 'フィールド分析に失敗',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}