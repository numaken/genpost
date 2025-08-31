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
    const { industry, service, challenge, writerType, readerType, goalType } = body

    if (!industry || !service || !challenge || !writerType || !readerType || !goalType) {
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

    // バリエーション設定
    const writerVariations = {
      owner: `あなたは${industryName}を実際に経営している現役オーナーです。自分の実体験に基づいて`,
      consultant: `あなたは${industryName}業界を専門とするコンサルタントです。豊富な専門知識と他社事例に基づいて`,
      expert: `あなたは${industryName}業界で長年サービスを提供している専門家です。技術的な知見と実践経験に基づいて`
    }

    const readerVariations = {
      prospect: `${industryName}のサービス利用を検討している見込み客に向けて`,
      peer: `同じ${industryName}業界を営む経営者・事業者に向けて`,
      beginner: `これから${industryName}業界での開業・参入を検討している人に向けて`
    }

    const goalVariations = {
      acquisition: `最終的に相談や来店につなげることを目的として、信頼関係を築き自然にサービスへ誘導する`,
      sharing: `業界の発展と同業者の成功を支援することを目的として、惜しみなく知識とノウハウを共有する`,
      branding: `自身の専門性と信頼性をアピールすることを目的として、権威性を示しながら価値のある情報を提供する`
    }

    const writerText = writerVariations[writerType as keyof typeof writerVariations]
    const readerText = readerVariations[readerType as keyof typeof readerVariations]
    const goalText = goalVariations[goalType as keyof typeof goalVariations]

    // OpenAI APIで記事生成
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { 
          role: 'system', 
          content: `${writerText}、${readerText}記事を作成します。

【記事の目的】
${goalText}内容にしてください。

【記事作成のポイント】
- 実践的で具体的な内容
- 読者が即座に行動できる
- 読者の立場に寄り添った文章
- 専門性と信頼性を感じられる内容

【記事構成】
1. 読者の心を掴む魅力的なタイトル
2. 読者の悩みや課題への共感
3. 具体的で実践的な解決策
4. すぐに始められるアクションステップ
5. 期待できる成果や変化

読者にとって価値のある、行動を促す記事を作成してください。` 
        },
        { 
          role: 'user', 
          content: `【記事のテーマ】
業界：${industryName}
サービス：${service}
解決したい課題：${challengeText}

この設定で、リピーター獲得と客単価向上を実現する記事を作成してください。
読者が「これは自分のことだ」「すぐに試してみたい」と感じる内容にしてください。` 
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