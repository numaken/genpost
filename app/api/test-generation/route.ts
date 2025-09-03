import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getPromptById } from '@/lib/prompts'
import { processPromptTemplate } from '@/lib/prompts'

// テスト用の記事生成API（WordPress投稿なし）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { promptId, inputs } = body

    // プロンプト取得
    const prompt = await getPromptById(promptId)
    if (!prompt) {
      return NextResponse.json({ error: '無効なプロンプトです' }, { status: 400 })
    }

    // OpenAI クライアント初期化
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    })

    // プロンプトテンプレート処理
    const processedUserPrompt = processPromptTemplate(prompt.user_prompt_template, inputs || {})
    
    // 記事生成
    const genConfig = prompt.gen_config || {}
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
      promptName: prompt.name,
      systemPrompt: prompt.system_prompt,
      userPrompt: processedUserPrompt,
      generatedContent: rawContent,
      generationTime,
      genConfig,
      inputs
    })

  } catch (error) {
    console.error('Test generation error:', error)
    return NextResponse.json({ error: 'テスト生成中にエラーが発生しました' }, { status: 500 })
  }
}