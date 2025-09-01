import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    // 開発環境では全員管理者として扱う（本番では特定のメールアドレスのみ）
    const isAdmin = process.env.NODE_ENV === 'development' || 
                    session.user.email === 'numaken@panolabollc.com' ||
                    session.user.email === 'admin@panolabollc.com'
    
    if (!isAdmin) {
      return NextResponse.json({ error: `管理者権限が必要です (現在: ${session.user.email})` }, { status: 401 })
    }

    const body = await request.json()
    const { action = 'import' } = body

    if (action === 'import') {
      // JSONファイルからデータを読み込み
      const jsonPath = path.join(process.cwd(), 'migration', 'catalog-prompts.json')
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
      
      let importedPrompts = 0
      let importedPacks = 0
      const errors: string[] = []

      // 業界パックをインポート
      for (const industry of jsonData.industries) {
        try {
          const { error } = await supabase
            .from('industry_packs')
            .upsert({
              pack_id: `${industry.key}-pack`,
              industry: industry.key,
              name: `${industry.name}パック`,
              description: `${industry.name}の全プロンプト（360個）がセットになったお得なパック。個別購入より70%お得！`,
              price: industry.packPrice,
              icon: industry.icon,
              is_active: true
            }, { onConflict: 'pack_id' })
          
          if (error) {
            errors.push(`Industry pack ${industry.key}: ${error.message}`)
          } else {
            importedPacks++
          }
        } catch (err) {
          errors.push(`Industry pack ${industry.key}: ${err}`)
        }
      }

      // プロンプトを小分けにしてインポート（Supabaseの制限対策）
      const batchSize = 100
      const promptBatches = []
      for (let i = 0; i < jsonData.prompts.length; i += batchSize) {
        promptBatches.push(jsonData.prompts.slice(i, i + batchSize))
      }

      for (let batchIndex = 0; batchIndex < promptBatches.length; batchIndex++) {
        const batch = promptBatches[batchIndex];
        try {
          const { error } = await supabase
            .from('prompts')
            .upsert(batch.map((prompt: any) => ({
              prompt_id: prompt.prompt_id,
              industry: prompt.industry,
              purpose: prompt.purpose,
              format: prompt.format,
              name: prompt.name,
              description: prompt.description,
              price: prompt.price,
              is_free: prompt.is_free,
              system_prompt: prompt.system_prompt,
              user_prompt_template: prompt.user_prompt_template,
              gen_config: prompt.gen_config,
              is_active: prompt.is_active
            })), { onConflict: 'prompt_id' })
          
          if (error) {
            errors.push(`Batch ${batchIndex + 1}: ${error.message}`)
          } else {
            importedPrompts += batch.length
          }
        } catch (err) {
          errors.push(`Batch ${batchIndex + 1}: ${err}`)
        }

        // レート制限対策で少し待機
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      return NextResponse.json({
        success: true,
        imported: {
          prompts: importedPrompts,
          packs: importedPacks
        },
        errors: errors.length > 0 ? errors : undefined
      })
    }

    if (action === 'status') {
      // インポート状況確認
      const { data: promptsCount } = await supabase
        .from('prompts')
        .select('*', { count: 'exact', head: true })
      
      const { data: packsCount } = await supabase
        .from('industry_packs')
        .select('*', { count: 'exact', head: true })

      return NextResponse.json({
        status: {
          prompts: promptsCount?.length || 0,
          packs: packsCount?.length || 0
        }
      })
    }

    return NextResponse.json({ error: '無効なアクションです' }, { status: 400 })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ 
      error: 'インポート処理に失敗',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}