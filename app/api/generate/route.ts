import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// プロンプトパックのマッピング
const PROMPT_PACKS = {
  'tech:wordpress': {
    system: 'あなたは優秀なWordPress技術ライターです。初心者にもわかりやすく、実践的なWordPress記事を作成してください。',
    user: 'WordPressの基本的な使い方について、初心者にもわかりやすい記事を書いてください。具体的な手順とスクリーンショットの説明を含めてください。'
  },
  'cooking:lunch': {
    system: 'あなたは料理研究家として、家庭で作りやすい昼食レシピ記事を作成してください。',
    user: '忙しい平日でも30分以内で作れる、栄養バランスの良い昼食レシピを紹介してください。材料リストと詳細な手順を含めてください。'
  },
  'travel:domestic': {
    system: 'あなたは国内旅行ライターとして、魅力的な国内観光スポット記事を作成してください。',
    user: '家族連れにおすすめの国内観光スポットを紹介してください。アクセス方法、料金、見どころを詳しく説明してください。'
  },
  'sidebiz:affiliate': {
    system: 'あなたはアフィリエイトマーケターとして、読者に価値を提供する商品紹介記事を作成してください。',
    user: '読者の悩みを解決する商品を紹介する記事を書いてください。メリット・デメリット、実体験に基づくレビューを含めてください。'
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { config, pack, count } = body

    if (!config.wpSiteUrl || !config.wpUser || !config.wpAppPass) {
      return NextResponse.json({ error: 'WordPress設定が不完全です' }, { status: 400 })
    }

    const promptPack = PROMPT_PACKS[pack as keyof typeof PROMPT_PACKS]
    if (!promptPack) {
      return NextResponse.json({ error: '無効なプロンプトパックです' }, { status: 400 })
    }

    const articles = []

    // 指定された記事数分生成
    for (let i = 0; i < count; i++) {
      try {
        // OpenAI APIで記事生成
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: promptPack.system },
            { role: 'user', content: promptPack.user }
          ],
          temperature: 0.7,
          max_tokens: 1200
        })

        const articleContent = completion.choices[0].message.content?.trim() || ''

        // WordPress REST APIで投稿
        const wpResponse = await fetch(`${config.wpSiteUrl}/wp-json/wp/v2/posts`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${config.wpUser}:${config.wpAppPass}`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: `AI生成記事 ${new Date().toLocaleString('ja-JP')}`,
            content: articleContent,
            status: 'draft',
            categories: [parseInt(config.categoryId) || 1]
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
      pack,
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