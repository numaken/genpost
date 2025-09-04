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
- 期間限定感のある行動喚起

【絶対遵守事項】
- ユーザープロンプトで指定された見出し構成を完全に使用すること
- 各見出しの内容指示に従って詳細な情報を含めること
- 一般的な内容ではなく、指定されたサンプル内容を参考にすること
- 記事は最低1500文字以上とすること`,
    user_prompt_template: `以下の条件で、読者の心を動かす実践的な記事を作成してください：

【基本情報】
サービス・商品：{service}
ターゲット：{target_audience}
解決する課題：{challenge}
独自の強み：{unique_value}

【重要：記事構成指示】
以下の構成に完全に従って記事を作成してください。各見出しと内容は必須です：

## なぜ{challenge}が多くの人の悩みなのか？

不動産業界の現状として、国土交通省の調査によると、初回売却者の78%が価格設定で失敗しています。よくある失敗例：
1. 近所の売却価格だけを参考にして500万円も安く売ってしまったAさん
2. 不動産会社1社だけの査定を信じて、結果的に300万円損したBさん
3. インターネットの一括査定だけで判断し、地域特性を無視したCさん

この問題を放置すると、数百万円単位の損失につながる可能性があります。

## {service}で確実に適正価格を知る5つのステップ

### ステップ1：基本情報の入力（所要時間：3分）
私たちのウェブサイトで物件情報を入力します。築年数、間取り、立地条件などを正確に入力することで、より精密な査定が可能になります。

### ステップ2：市場データとの照合（当日中に完了）
地域の過去3年間の取引データ、路線価、公示価格など複数の指標と照合します。これにより机上査定額を算出します。

### ステップ3：現地調査の実施（査定員が訪問）
専門査定士がご自宅を直接拝見し、設備状況、メンテナンス状態、周辺環境を詳細チェックします。

### ステップ4：詳細査定書の作成（調査後2日以内）
机上査定と現地調査の結果を総合し、根拠が明確な査定書をお渡しします。

### ステップ5：売却プランの提案
査定額をもとに、最適な売却時期や戦略をアドバイスします。

実際の利用者の声：
「田中さん（48歳）：当初は3,200万円と言われましたが、詳細査定の結果3,680万円で売却できました。480万円も高く売れて本当に助かりました。」

## 実際の成功事例と効果

### ケース1：築15年のマンション売却
- Before：他社査定 2,800万円
- After：当社サポート後 3,150万円（+350万円）
- ポイント：リフォーム履歴と管理状況を正しく評価

### ケース2：戸建て住宅の売却
- Before：相場より500万円安い査定
- After：適正価格で3ヶ月以内に売却成功
- {unique_value}の効果：地域に精通した担当者が近隣の開発情報を活用

### ケース3：投資物件の売却
- Before：賃貸収益を適正評価されず
- After：収益性を考慮した査定で20%アップ

平均的に、当サービス利用者は他社査定より15-25%高い価格での売却を実現しています。

## 今すぐ無料査定を始める方法

### お申込み手順：
1. 公式サイトの「無料査定申込み」ボタンをクリック
2. 物件情報を3分で入力
3. 翌営業日に担当者からご連絡
4. 現地調査日程の調整
5. 査定書のお渡し（完全無料）

### 限定特典（今月末まで）：
- 初回相談者限定：売却成功時の仲介手数料10%割引
- 査定後1週間以内のご契約で、ハウスクリーニング費用当社負担
- 無料相談時にオリジナル「売却成功ガイドブック」プレゼント

### 安心の保証：
- 査定費用完全無料（出張費も不要）
- しつこい営業は一切なし（お客様のペースでご検討いただけます）
- 宅地建物取引業免許取得の専門スタッフが対応

【記事品質チェックリスト】
✓ 具体的な数値が5個以上含まれている
✓ 専門用語が3個以上使われ、全て説明されている
✓ 実例や事例が3個以上紹介されている
✓ 地域密着の強みが具体的に表現されている
✓ 読後に行動したくなる訴求力がある

記事の最後に「まとめ」として、読者の背中を押す強いメッセージを含めてください。

【最終確認】
上記の見出し構成と内容指示に完全に従って記事を作成してください。
- 各見出し（##）は必ず使用
- 具体的な数値やデータを多数含める
- 成功事例は Before/After 形式で記載
- 申し込み手順や特典を詳細に記載

これらの要素を全て含んだ1500文字以上の記事を作成してください。`,
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
    let systemPrompt, userPromptTemplate, genConfig, promptName
    
    console.log('Debug:', { useImproved, promptId, hasImprovedPrompt: !!(IMPROVED_PROMPTS as any)[promptId] })
    
    if (useImproved && (IMPROVED_PROMPTS as any)[promptId]) {
      console.log('Using improved prompt for:', promptId)
      const improvedPrompt = (IMPROVED_PROMPTS as any)[promptId]
      systemPrompt = improvedPrompt.system_prompt
      userPromptTemplate = improvedPrompt.user_prompt_template
      genConfig = improvedPrompt.gen_config
      promptName = `改良版: ${promptId}`
    } else {
      console.log('Using original prompt for:', promptId)
      // 通常版プロンプト取得
      const prompt = await getPromptById(promptId)
      if (!prompt) {
        return NextResponse.json({ error: '無効なプロンプトです' }, { status: 400 })
      }
      systemPrompt = prompt.system_prompt
      userPromptTemplate = prompt.user_prompt_template
      genConfig = prompt.gen_config || {}
      promptName = prompt.name
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
        { role: 'system', content: systemPrompt },
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
      promptName,
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