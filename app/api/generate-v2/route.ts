import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { createClient } from '@supabase/supabase-js'
import { authOptions } from '../auth/[...nextauth]/route'
import { PromptEngineV2 } from '@/lib/prompt-engine-v2'
import { 
  GenerateArticleRequest,
  GenerateArticleResponse,
  MessageContract,
  GenerationRequest
} from '@/lib/contracts-v2'
import { canUseSharedApiKey, incrementUsage } from '@/lib/usage-limits'
import { getUserApiKey } from '@/lib/api-keys'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================================================
// POST /api/generate-v2 - Generate article with verification
// ============================================================================
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.email
    const body: GenerateArticleRequest = await req.json()

    // Validate request
    if (!body.contract_id) {
      return NextResponse.json({ 
        error: 'contract_id is required' 
      }, { status: 400 })
    }

    // Get contract
    const { data: contractData, error: contractError } = await supabase
      .from('message_contracts')
      .select('*')
      .eq('contract_id', body.contract_id)
      .eq('status', 'active')
      .single()

    if (contractError || !contractData) {
      return NextResponse.json({ 
        error: 'Contract not found or inactive' 
      }, { status: 404 })
    }

    const contract: MessageContract = contractData

    // Verify user has access to this contract
    if (contract.created_by !== userId) {
      return NextResponse.json({ 
        error: 'Access denied' 
      }, { status: 403 })
    }

    // Determine keywords to use
    let keywords = body.keywords
    if (!keywords || keywords.length === 0) {
      // Use magic hints or generate from contract
      keywords = contract.magic_hints.length > 0 
        ? contract.magic_hints.slice(0, 3)
        : [contract.claim.headline.split(' ')[0], contract.audience.persona.split(' ')[0]]
    }

    if (keywords.length === 0) {
      return NextResponse.json({
        error: 'No keywords available for generation'
      }, { status: 400 })
    }

    // Check for similar existing articles (deduplication)
    if (!body.dry_run) {
      const similarityCheck = await checkForSimilarArticles(userId, keywords)
      if (similarityCheck.tooSimilar) {
        return NextResponse.json({
          error: 'Similar article already exists',
          similar_titles: similarityCheck.titles,
          suggestion: 'Try different keywords or modify your approach'
        }, { status: 409 })
      }
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

    if (!apiKey) {
      return NextResponse.json({
        error: 'No API key available'
      }, { status: 500 })
    }

    // Initialize generation engine
    const engine = new PromptEngineV2(apiKey)

    // Prepare generation request
    const genRequest: GenerationRequest = {
      contract,
      keywords,
      model: body.model || 'gpt-4o-mini',
      max_retries: 2
    }

    try {
      // Generate article with verification
      const result = await engine.generateArticle(genRequest)

      // Save audit to database if not dry run
      if (!body.dry_run) {
        const { error: auditError } = await supabase
          .from('generation_audit')
          .insert({
            ...result.audit,
            user_id: userId
          })

        if (auditError) {
          console.error('Failed to save audit:', auditError)
        }

        // Save article to database
        const { error: articleError } = await supabase
          .from('generated_articles')
          .insert({
            ...result.article,
            user_id: userId
          })

        if (articleError) {
          console.error('Failed to save article:', articleError)
        }

        // Increment usage if using shared API
        if (!userApiKey) {
          await incrementUsage(userId, true)
        }
      }

      const response: GenerateArticleResponse = {
        success: true,
        article: result.article,
        verification: result.verification,
        audit_id: result.audit.id
      }

      return NextResponse.json(response)

    } catch (genError: any) {
      console.error('Generation error:', genError.message)
      
      return NextResponse.json({
        success: false,
        error: genError.message || 'Article generation failed',
        details: body.dry_run ? genError.stack : undefined
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('[generate-v2:post:exception]', error.message)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// ============================================================================
// GET /api/generate-v2 - Get generation status/history
// ============================================================================
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')
    const contract_id = searchParams.get('contract_id')

    let query = supabase
      .from('generated_articles')
      .select(`
        *,
        generation_audit!inner(
          contract_ref,
          model,
          verification_score,
          cost_estimate_cents,
          retries,
          created_at
        )
      `)
      .eq('user_id', session.user.email)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (contract_id) {
      query = query.eq('generation_audit.contract_ref', `${contract_id}@1.0.0`)
    }

    const { data, error } = await query

    if (error) {
      console.error('[generate-v2:get:error]', error.message)
      return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 })
    }

    // Get summary statistics
    const { data: stats, error: statsError } = await supabase
      .from('generation_audit')
      .select('verification_score, cost_estimate_cents, retries')
      .eq('user_id', session.user.email)

    const summary = stats ? {
      total_articles: stats.length,
      average_score: stats.reduce((sum, item) => sum + item.verification_score, 0) / stats.length,
      total_cost_cents: stats.reduce((sum, item) => sum + item.cost_estimate_cents, 0),
      average_retries: stats.reduce((sum, item) => sum + item.retries, 0) / stats.length
    } : null

    return NextResponse.json({
      articles: data || [],
      summary
    })

  } catch (error: any) {
    console.error('[generate-v2:get:exception]', error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function checkForSimilarArticles(
  userId: string, 
  keywords: string[], 
  threshold: number = 0.85
): Promise<{ tooSimilar: boolean; titles: string[] }> {
  try {
    // Get recent articles by the same user
    const { data: recentArticles, error } = await supabase
      .from('generated_articles')
      .select('title, primary_keyword, secondary_keywords, title_vector')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .order('created_at', { ascending: false })
      .limit(50)

    if (error || !recentArticles) {
      return { tooSimilar: false, titles: [] }
    }

    const primaryKeyword = keywords[0].toLowerCase()
    const similarTitles: string[] = []

    for (const article of recentArticles) {
      // Simple keyword-based similarity check
      const articleKeywords = [
        article.primary_keyword, 
        ...(article.secondary_keywords || [])
      ].map(k => k.toLowerCase())

      // Check if primary keyword matches
      if (articleKeywords.includes(primaryKeyword)) {
        similarTitles.push(article.title)
      }

      // TODO: Implement vector-based similarity when title_vector is available
      // if (article.title_vector) {
      //   const similarity = cosineSimilarity(newTitleVector, article.title_vector)
      //   if (similarity > threshold) {
      //     similarTitles.push(article.title)
      //   }
      // }
    }

    return {
      tooSimilar: similarTitles.length > 0,
      titles: similarTitles.slice(0, 5) // Limit to 5 examples
    }

  } catch (error) {
    console.error('Similarity check error:', error)
    return { tooSimilar: false, titles: [] }
  }
}