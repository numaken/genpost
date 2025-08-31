import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import OpenAI from 'openai'
import { getPromptById, hasUserPurchased, recordPromptUsage, processPromptTemplate } from '@/lib/prompts'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // セッション取得
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { config, promptId, count, inputs } = body

    if (!config.wpSiteUrl || !config.wpUser || !config.wpAppPass) {
      return NextResponse.json({ error: 'WordPress設定が不完全です' }, { status: 400 })
    }

    // プロンプト取得
    const prompt = await getPromptById(promptId)
    if (!prompt) {
      return NextResponse.json({ error: '無効なプロンプトです' }, { status: 400 })
    }

    // 購入確認（無料プロンプトまたは購入済みプロンプトのみ使用可能）
    const userId = session.user.email
    const canUse = prompt.is_free || await hasUserPurchased(userId, promptId)
    if (!canUse) {
      return NextResponse.json({ error: 'このプロンプトは購入されていません' }, { status: 403 })
    }

    const articles = []

    // プロンプトテンプレート処理
    const processedUserPrompt = processPromptTemplate(prompt.user_prompt_template, inputs || {})

    // 指定された記事数分生成
    for (let i = 0; i < count; i++) {
      try {
        // 使用履歴記録
        await recordPromptUsage(userId, promptId)

        // OpenAI APIで記事生成（G.E.N.設定を適用）
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: prompt.system_prompt },
            { role: 'user', content: processedUserPrompt }
          ],
          temperature: prompt.gen_config?.engine?.temperature || 0.7,
          max_tokens: prompt.gen_config?.engine?.max_tokens || 1500
        })

        const articleContent = completion.choices[0].message.content?.trim() || ''

        // WordPress REST APIで投稿
        const articleTitle = `${prompt.name} - ${new Date().toLocaleString('ja-JP')}`
        const wpResponse = await fetch(`${config.wpSiteUrl}/wp-json/wp/v2/posts`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${config.wpUser}:${config.wpAppPass}`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: articleTitle,
            content: articleContent,
            status: 'draft',
            categories: [parseInt(config.categoryId) || 1],
            meta: {
              'genpost_prompt_id': promptId,
              'genpost_generated': true
            }
          })
        })

        if (wpResponse.ok) {
          const wpData = await wpResponse.json()
          articles.push({
            id: wpData.id,
            title: wpData.title.rendered,
            status: 'success',
            url: wpData.link
          })
        } else {
          articles.push({
            error: 'WordPress投稿に失敗しました',
            status: 'error'
          })
        }

        // レート制限対策: 各記事間に5秒待機
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 5000))
        }

      } catch (error) {
        articles.push({
          error: `記事${i + 1}の生成に失敗: ${error}`,
          status: 'error'
        })
      }
    }

    return NextResponse.json({
      id: Date.now().toString(),
      promptId,
      promptName: prompt.name,
      count,
      status: 'completed',
      articles,
      createdAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Generation error:', error)
    return NextResponse.json({ error: '記事生成中にエラーが発生しました' }, { status: 500 })
  }
}