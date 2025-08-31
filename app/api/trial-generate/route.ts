import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// IP制限用のメモリキャッシュ（本番では Redis を推奨）
const ipUsageCache = new Map<string, number>()
const DAILY_LIMIT = 1
const RESET_TIME = 24 * 60 * 60 * 1000 // 24時間

export async function POST(request: NextRequest) {
  try {
    // IP制限チェック
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown'
    
    const now = Date.now()
    const lastUsed = ipUsageCache.get(ip) || 0
    
    if (now - lastUsed < RESET_TIME) {
      return NextResponse.json({ error: '本日の利用制限に達しました。明日再度お試しください。' }, { status: 429 })
    }

    const body = await request.json()
    const { industry, service, challenge } = body

    if (!industry || !service || !challenge) {
      return NextResponse.json({ error: '全ての項目を入力してください' }, { status: 400 })
    }

    // 業界と課題のマッピング
    const industryNames = {
      cafe: 'カフェ',
      beauty: '美容院',
      restaurant: 'レストラン', 
      retail: '雑貨店',
      fitness: 'ジム',
      massage: '整体院',
      clinic: 'クリニック',
      school: '塾',
      other: 'サービス業'
    }

    const challengeTexts = {
      onetime: '一度来てそれっきりの客が多い',
      lowprice: '客単価が低い',
      competition: '競合に客を取られる', 
      seasonal: '季節によって売上が不安定',
      newcustomer: '新規客ばかりでリピートがない'
    }

    const industryName = industryNames[industry as keyof typeof industryNames] || 'サービス業'
    const challengeText = challengeTexts[challenge as keyof typeof challengeTexts] || '売上アップが課題'

    // OpenAI APIで記事生成
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { 
          role: 'system', 
          content: `あなたはリピーター獲得とビジネス成長の専門家です。実践的で具体的なアドバイスを提供し、読者が即座に行動できる記事を作成してください。成功事例を交えながら、説得力のある内容にしてください。` 
        },
        { 
          role: 'user', 
          content: `${industryName}を経営しており、主力商品・サービスは「${service}」です。現在「${challengeText}」という課題があります。

客単価を向上させ、リピーター獲得を実現する具体的な戦略について、実践的な記事を書いてください。

記事構成：
1. 魅力的なタイトル（数値や具体的な成果を含む）
2. 問題の共感と現状分析
3. 具体的な解決策（3-5つ）
4. 実践ステップ
5. 期待できる成果

読みやすく、すぐに実践できる内容でお願いします。` 
        }
      ],
      temperature: 0.7,
      max_tokens: 1800
    })

    const fullContent = completion.choices[0].message.content?.trim() || ''
    
    // タイトルと本文を分離
    const lines = fullContent.split('\n')
    const title = lines[0].replace(/^(#\s*|タイトル[：:]\s*)/i, '').trim()
    const content = lines.slice(1).join('\n').trim()

    // IP使用記録
    ipUsageCache.set(ip, now)

    return NextResponse.json({
      title,
      content,
      industry: industryName,
      service,
      challenge: challengeText
    })

  } catch (error) {
    console.error('Trial generation error:', error)
    return NextResponse.json({ error: '記事生成中にエラーが発生しました' }, { status: 500 })
  }
}