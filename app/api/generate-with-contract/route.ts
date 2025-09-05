import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { createClient } from '@supabase/supabase-js'
import { authOptions } from '../auth/[...nextauth]/route'
import { PromptEngine } from '@/lib/prompt-engine'
import { MessageContract, GeneratedArticle, VerificationResult } from '@/lib/message-contracts'
import { canUseSharedApiKey, incrementUsage } from '@/lib/usage-limits'
import { getUserApiKey } from '@/lib/api-keys'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function to call OpenAI
async function callOpenAI(prompt: string, systemPrompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

// Helper function to verify article
async function verifyArticle(
  contract: MessageContract, 
  article: string, 
  apiKey: string
): Promise<VerificationResult> {
  try {
    const promptData = PromptEngine.generatePrompt(contract)
    const verificationResponse = await callOpenAI(
      `${promptData.verification_prompt}\n\n# 検証対象記事\n${article}`,
      'You are a strict editorial reviewer. Output valid JSON only.',
      apiKey
    )

    // Extract JSON from response
    const jsonMatch = verificationResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in verification response')
    }

    const verification: VerificationResult = JSON.parse(jsonMatch[0])
    return verification
  } catch (error) {
    console.error('Verification error:', error)
    return {
      score: 50,
      checks: {
        speaker_clear: true,
        claim_clear: true,
        audience_targeted: true,
        benefit_concrete: false,
        proof_included: false,
        cta_natural: true,
        constraints_met: true,
        uniqueness_present: false,
      },
      reasons: ['自動検証エラー'],
      needs_regeneration: false,
      fix_brief: '検証システムエラーのため手動確認が必要'
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    const userId = session.user.email
    const body = await req.json()
    const { contract_id, user_inputs = {}, generation_settings = {} } = body

    if (!contract_id) {
      return NextResponse.json({ error: 'contract_id が必要です' }, { status: 400 })
    }

    // Get contract
    const { data: contractData, error: contractError } = await supabase
      .from('message_contracts')
      .select('*')
      .eq('contract_id', contract_id)
      .eq('is_active', true)
      .single()

    if (contractError || !contractData) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const contract: MessageContract = contractData

    // Check if user has access to this contract
    if (!contract.is_free) {
      const { data: purchase } = await supabase
        .from('user_message_contracts')
        .select('id')
        .eq('user_id', userId)
        .eq('contract_id', contract_id)
        .eq('is_active', true)
        .single()

      if (!purchase) {
        return NextResponse.json({ error: 'Contract not purchased' }, { status: 403 })
      }
    }

    // Validate required inputs
    const validation = PromptEngine.validateInputs(contract, user_inputs)
    if (!validation.valid) {
      return NextResponse.json({ 
        error: 'Missing required inputs', 
        missing: validation.missing 
      }, { status: 400 })
    }

    // Get API key (user's or shared)
    const userApiKey = await getUserApiKey(userId, 'openai')
    let apiKey = userApiKey

    if (!userApiKey) {
      // Check shared API usage limits
      const usage = await canUseSharedApiKey(userId)
      if (!usage.canUse) {
        return NextResponse.json({ 
          error: usage.reason,
          usage: usage.usage,
          subscription: usage.subscription
        }, { status: 429 })
      }
      
      apiKey = process.env.OPENAI_API_KEY!
    }

    // Generate dynamic prompt
    const promptData = PromptEngine.generatePrompt(contract, user_inputs)

    // Generate article
    let article = await callOpenAI(promptData.user_prompt, promptData.system_prompt, apiKey)

    // Verify article quality
    const verification = await verifyArticle(contract, article, apiKey)

    // Regenerate once if needed and score is too low
    if (verification.needs_regeneration && verification.score < 70) {
      const regenerationPrompt = promptData.regeneration_prompt.replace('{{FIX_BRIEF}}', verification.fix_brief)
      article = await callOpenAI(regenerationPrompt, promptData.system_prompt, apiKey)
      
      // Re-verify
      const newVerification = await verifyArticle(contract, article, apiKey)
      if (newVerification.score > verification.score) {
        Object.assign(verification, newVerification)
      }
    }

    // Extract metadata from article
    const lines = article.split('\n')
    const title = lines.find(line => line.startsWith('# '))?.replace('# ', '') || '生成記事'
    const metaDescription = article.substring(0, 160).replace(/[#*\n]/g, ' ').trim()
    const estimatedReadingTime = Math.ceil(article.length / 400) // 400 chars per minute in Japanese

    // Create response
    const generatedArticle: GeneratedArticle = {
      title,
      content: article,
      meta_description: metaDescription,
      internal_links: [],
      tags: [contract.speaker.role, ...Object.keys(user_inputs)],
      estimated_reading_time: estimatedReadingTime,
      verification_score: verification.score,
      verification_details: verification
    }

    // Increment usage if using shared API
    if (!userApiKey) {
      await incrementUsage(userId, true)
    }

    return NextResponse.json({ 
      success: true, 
      article: generatedArticle,
      contract_used: {
        id: contract.id,
        name: contract.name,
        contract_id: contract.contract_id
      }
    })

  } catch (error: any) {
    console.error('Generate with contract error:', error)
    return NextResponse.json({ 
      error: error.message || '記事生成中にエラーが発生しました' 
    }, { status: 500 })
  }
}