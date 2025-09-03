import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getPromptById } from '@/lib/prompts'
import { processPromptTemplate } from '@/lib/prompts'
import { getPromptVersion } from '@/lib/prompt-versions'

// 改良版プロンプト（直接定義）
const IMPROVED_PROMPTS = {
  'real-estate-customer-acquisition-how-to': {
    system_prompt: `あなたは不動産業界で15年の実績を持つ専門ライター兼コンサルタントです。読者に具体的で実践的な価値を提供し、信頼関係を築く記事を作成してください。

【記事品質基準】
- 文字数：1500-2000文字（見出し含む）
- 構造：導入(150字)→本文(1200字)→まとめ(150字)
- 見出し：H2を3-4個、H3を各H2に2-3個設置
- 具体性：数値、事例、専門用語を必ず含める
- 専門性：業界の裏側や専門知識を分かりやすく説明
- 地域性：地域密着の強みを具体的に表現

【文章スタイル】
- 一人称：「私たち」「弊社では」
- 読者への呼びかけ：「お客様」「ご相談者様」
- 専門用語：必ず分かりやすい説明を併記
- 実例：「実際に○○のケースでは」を多用

【必須要素】
- 業界データや相場情報
- 成功事例（具体的な数値）
- よくある失敗例と対策
- 期間限定感のある行動喚起`,
    user_prompt_template: `以下の条件で、読者の心を動かす実践的な記事を作成してください：

【基本情報】
サービス・商品：{service}
ターゲット：{target_audience}
解決する課題：{challenge}
独自の強み：{unique_value}

【記事構成指示】
## H2見出し1：課題の深堀り（なぜ{challenge}が起きるのか）
- 業界データを使った現状説明
- よくある失敗例を2-3個紹介
- この問題を放置するリスク

## H2見出し2：解決策の詳細（{service}の活用方法）
- 具体的なステップを4-5個に分けて説明
- 各ステップで得られるメリット
- 実際の利用者の声（仮想でも具体的に）

## H2見出し3：成功事例と効果
- 具体的な改善データ（査定額、期間等）
- Before/Afterの比較
- {unique_value}が生んだ特別な結果

## H2見出し4：今すぐ始める方法
- 申込み手順の詳細
- 期間限定の特典やキャンペーン
- 不安を解消する保証内容

【記事品質チェックリスト】
✓ 具体的な数値が5個以上含まれている
✓ 専門用語が3個以上使われ、全て説明されている
✓ 実例や事例が3個以上紹介されている
✓ 地域密着の強みが具体的に表現されている
✓ 読後に行動したくなる訴求力がある

記事の最後に「まとめ」として、読者の背中を押す強いメッセージを含めてください。`,
    gen_config: {
      model: "gpt-4o-mini",
      temperature: 0.6,
      max_tokens: 2500,
      top_p: 0.8,
      presence_penalty: 0.2,
      frequency_penalty: 0.3
    }
  }
}

// テスト用の記事生成API（WordPress投稿なし）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { promptId, inputs, useImproved = false } = body

    // 改良版を使用する場合
    let systemPrompt, userPromptTemplate, genConfig
    
    if (useImproved && IMPROVED_PROMPTS[promptId]) {
      const improvedPrompt = IMPROVED_PROMPTS[promptId]
      systemPrompt = improvedPrompt.system_prompt
      userPromptTemplate = improvedPrompt.user_prompt_template
      genConfig = improvedPrompt.gen_config
    } else {
      // 通常版プロンプト取得
      const prompt = await getPromptById(promptId)
      if (!prompt) {
        return NextResponse.json({ error: '無効なプロンプトです' }, { status: 400 })
      }
      systemPrompt = prompt.system_prompt
      userPromptTemplate = prompt.user_prompt_template
      genConfig = prompt.gen_config || {}
    }

    // OpenAI クライアント初期化
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    })

    // プロンプトテンプレート処理
    const processedUserPrompt = processPromptTemplate(userPromptTemplate, inputs || {})
    const startTime = Date.now()
    
    const completion = await openai.chat.completions.create({
      model: genConfig.model || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: prompt.system_prompt },
        { role: 'user', content: processedUserPrompt }
      ],
      temperature: genConfig.temperature || 0.5,
      max_tokens: genConfig.max_tokens || 2000,
      top_p: genConfig.top_p || 0.9,
      presence_penalty: genConfig.presence_penalty || 0.1,
      frequency_penalty: genConfig.frequency_penalty || 0.1
    })
    
    const generationTime = Date.now() - startTime
    const rawContent = completion.choices[0].message.content?.trim() || ''

    return NextResponse.json({
      promptId,
      promptName: useImproved ? `改良版: ${promptId}` : prompt?.name || promptId,
      systemPrompt,
      userPrompt: processedUserPrompt,
      generatedContent: rawContent,
      generationTime,
      genConfig,
      inputs,
      version: useImproved ? 'v2.0 (improved)' : 'v1.0 (original)'
    })

  } catch (error) {
    console.error('Test generation error:', error)
    return NextResponse.json({ error: 'テスト生成中にエラーが発生しました' }, { status: 500 })
  }
}