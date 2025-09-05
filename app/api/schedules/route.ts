import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { createClient } from '@supabase/supabase-js'
import { authOptions } from '../auth/[...nextauth]/route'
import { 
  Schedule, 
  CreateScheduleRequest,
  ScheduleUpdate,
  PublishJob
} from '@/lib/contracts-v2'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function to parse cron and calculate next execution
function parseNextExecution(cron: string, tz: string = 'Asia/Tokyo'): string {
  // Simple cron parser for daily scheduling
  // Format: "minute hour * * *"
  const parts = cron.split(' ')
  if (parts.length !== 5) {
    throw new Error('Invalid cron format')
  }

  const [minute, hour] = parts
  const now = new Date()
  const next = new Date(now)
  
  next.setHours(parseInt(hour), parseInt(minute), 0, 0)
  
  // If the time has passed today, schedule for tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1)
  }

  return next.toISOString()
}

// Helper function to generate keyword combinations
function generateKeywordCombinations(keywords: string[], size: number = 3): string[][] {
  if (keywords.length < size) {
    return [keywords] // Return single combination if not enough keywords
  }

  const combinations: string[][] = []
  
  // Generate all possible combinations of specified size
  function combine(start: number, combo: string[]) {
    if (combo.length === size) {
      combinations.push([...combo])
      return
    }
    
    for (let i = start; i < keywords.length; i++) {
      combo.push(keywords[i])
      combine(i + 1, combo)
      combo.pop()
    }
  }
  
  combine(0, [])
  return combinations
}

// ============================================================================
// GET /api/schedules - List user schedules
// ============================================================================
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'active'
    const includeJobs = searchParams.get('include_jobs') === 'true'

    let query = supabase
      .from('schedules')
      .select(`
        *,
        wordpress_sites!inner(site_name, site_url)
      `)
      .eq('user_id', session.user.email)
      .eq('status', status)
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('[schedules:get:error]', error.message)
      return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 })
    }

    let schedules = data || []

    // Include job counts if requested
    if (includeJobs) {
      for (const schedule of schedules) {
        const { data: jobs } = await supabase
          .from('publish_jobs')
          .select('state')
          .eq('schedule_id', schedule.id)

        const jobCounts = (jobs || []).reduce((acc: any, job: any) => {
          acc[job.state] = (acc[job.state] || 0) + 1
          return acc
        }, {})

        schedule.job_counts = jobCounts
      }
    }

    return NextResponse.json({ schedules })

  } catch (error: any) {
    console.error('[schedules:get:exception]', error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================================
// POST /api/schedules - Create schedule
// ============================================================================
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body: CreateScheduleRequest = await req.json()

    // Validate required fields
    const requiredFields = ['site_id', 'contract_id', 'wp_site_url', 'category_slug', 'post_count', 'cron', 'keyword_pool']
    for (const field of requiredFields) {
      if (!body[field as keyof CreateScheduleRequest]) {
        return NextResponse.json({ 
          error: `Missing required field: ${field}` 
        }, { status: 400 })
      }
    }

    // Validate keyword pool
    if (!Array.isArray(body.keyword_pool) || body.keyword_pool.length < 3) {
      return NextResponse.json({
        error: 'keyword_pool must be an array with at least 3 keywords'
      }, { status: 400 })
    }

    // Validate post count
    if (body.post_count < 1 || body.post_count > 100) {
      return NextResponse.json({
        error: 'post_count must be between 1 and 100'
      }, { status: 400 })
    }

    // Verify site ownership
    const { data: site, error: siteError } = await supabase
      .from('wordpress_sites')
      .select('id, user_id')
      .eq('id', body.site_id)
      .single()

    if (siteError || !site || site.user_id !== session.user.email) {
      return NextResponse.json({ error: 'Invalid site_id or access denied' }, { status: 403 })
    }

    // Verify contract exists and belongs to user
    const { data: contract, error: contractError } = await supabase
      .from('message_contracts')
      .select('id, created_by, contract_id')
      .eq('contract_id', body.contract_id)
      .eq('status', 'active')
      .single()

    if (contractError || !contract || contract.created_by !== session.user.email) {
      return NextResponse.json({ error: 'Invalid contract_id or access denied' }, { status: 403 })
    }

    try {
      const nextExecution = parseNextExecution(body.cron, 'Asia/Tokyo')
      
      // Create schedule
      const schedule: Partial<Schedule> = {
        id: crypto.randomUUID(),
        user_id: session.user.email,
        site_id: body.site_id,
        contract_id: body.contract_id,
        contract_version: '1.0.0', // Default version
        wp_site_url: body.wp_site_url,
        category_slug: body.category_slug,
        post_status: body.post_status || 'publish',
        post_count: body.post_count,
        cron: body.cron,
        tz: 'Asia/Tokyo',
        keyword_pool: body.keyword_pool,
        used_keyword_sets: [],
        current_keyword_index: 0,
        status: 'active',
        next_generation_at: nextExecution,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: scheduleData, error } = await supabase
        .from('schedules')
        .insert(schedule)
        .select()
        .single()

      if (error) {
        console.error('[schedules:post:error]', error.message)
        return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 })
      }

      // Generate initial publish jobs
      const jobs: Partial<PublishJob>[] = []
      const combinations = generateKeywordCombinations(body.keyword_pool)
      
      let currentDate = new Date(nextExecution)
      const cronParts = body.cron.split(' ')
      const intervalDays = 1 // Daily for now, can be extended

      for (let i = 0; i < body.post_count; i++) {
        const keywordSet = combinations[i % combinations.length] || body.keyword_pool.slice(0, 3)
        
        jobs.push({
          id: crypto.randomUUID(),
          schedule_id: scheduleData.id,
          planned_at: new Date(currentDate).toISOString(),
          state: 'queued',
          retry_count: 0,
          max_retries: 3,
          keywords_used: keywordSet,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

        // Increment date for next job
        currentDate.setDate(currentDate.getDate() + intervalDays)
      }

      const { error: jobsError } = await supabase
        .from('publish_jobs')
        .insert(jobs)

      if (jobsError) {
        console.error('[schedules:post:jobs-error]', jobsError.message)
        // Don't fail the entire request, jobs can be created later
      }

      return NextResponse.json({ 
        schedule: scheduleData,
        jobs_created: jobs.length
      }, { status: 201 })

    } catch (cronError) {
      return NextResponse.json({
        error: 'Invalid cron format'
      }, { status: 400 })
    }

  } catch (error: any) {
    console.error('[schedules:post:exception]', error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================================
// PUT /api/schedules - Update schedule
// ============================================================================
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await req.json()
    const { id, ...updateData }: { id: string } & ScheduleUpdate = body

    if (!id) {
      return NextResponse.json({ error: 'Schedule ID required' }, { status: 400 })
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('schedules')
      .select('id, user_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    if (existing.user_id !== session.user.email) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update schedule
    const { data, error } = await supabase
      .from('schedules')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[schedules:put:error]', error.message)
      return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 })
    }

    // If status changed to paused/completed, update related jobs
    if (updateData.status && updateData.status !== 'active') {
      await supabase
        .from('publish_jobs')
        .update({ 
          state: updateData.status === 'paused' ? 'cancelled' : 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('schedule_id', id)
        .eq('state', 'queued')
    }

    return NextResponse.json({ schedule: data })

  } catch (error: any) {
    console.error('[schedules:put:exception]', error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================================
// DELETE /api/schedules - Delete schedule
// ============================================================================
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Schedule ID required' }, { status: 400 })
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('schedules')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    if (existing.user_id !== session.user.email) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Cancel all pending jobs
    await supabase
      .from('publish_jobs')
      .update({ 
        state: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('schedule_id', id)
      .in('state', ['queued', 'running'])

    // Soft delete schedule
    const { error } = await supabase
      .from('schedules')
      .update({ 
        status: 'completed', // Mark as completed rather than deleting
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('[schedules:delete:error]', error.message)
      return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('[schedules:delete:exception]', error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}