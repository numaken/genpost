import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { createClient } from '@supabase/supabase-js'
import { authOptions } from '../auth/[...nextauth]/route'
import { 
  JobScheduler, 
  JobWorker, 
  getJobStats, 
  cleanupExpiredLocks, 
  retryFailedJobs 
} from '@/lib/jobs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================================================
// GET /api/jobs - Get job statistics and status
// ============================================================================
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')
    const userId = session.user.email

    // Admin-only actions
    const isAdmin = process.env.ADMIN_EMAILS?.split(',').includes(userId)

    switch (action) {
      case 'stats':
        // Get overall job statistics (admin only for now)
        if (!isAdmin) {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }
        
        const stats = await getJobStats()
        return NextResponse.json({ stats })

      case 'user-jobs':
        // Get jobs for current user
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
        const offset = parseInt(searchParams.get('offset') || '0')
        const state = searchParams.get('state') || 'all'

        let query = supabase
          .from('publish_jobs')
          .select(`
            id,
            schedule_id,
            planned_at,
            started_at,
            finished_at,
            state,
            retry_count,
            max_retries,
            keywords_used,
            article_title,
            wp_post_url,
            error_message,
            schedules!inner(user_id, contract_id)
          `)
          .eq('schedules.user_id', userId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (state !== 'all') {
          query = query.eq('state', state)
        }

        const { data: userJobs, error: jobsError } = await query

        if (jobsError) {
          console.error('[jobs:get:user-jobs:error]', jobsError.message)
          return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
        }

        return NextResponse.json({ jobs: userJobs || [] })

      case 'schedules':
        // Get user's schedules with job counts
        const { data: schedules, error: schedulesError } = await supabase
          .from('schedules')
          .select(`
            *,
            wordpress_sites!inner(site_name, site_url)
          `)
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        if (schedulesError) {
          console.error('[jobs:get:schedules:error]', schedulesError.message)
          return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 })
        }

        // Add job counts for each schedule
        const schedulesWithStats = await Promise.all(
          (schedules || []).map(async (schedule) => {
            const { data: jobs } = await supabase
              .from('publish_jobs')
              .select('state')
              .eq('schedule_id', schedule.id)

            const jobCounts = (jobs || []).reduce((acc: any, job: any) => {
              acc[job.state] = (acc[job.state] || 0) + 1
              return acc
            }, {})

            return {
              ...schedule,
              job_counts: jobCounts,
              total_jobs: jobs?.length || 0
            }
          })
        )

        return NextResponse.json({ schedules: schedulesWithStats })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error: any) {
    console.error('[jobs:get:exception]', error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================================
// POST /api/jobs - Trigger manual actions
// ============================================================================
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await req.json()
    const { action } = body
    const userId = session.user.email

    // Admin-only actions
    const isAdmin = process.env.ADMIN_EMAILS?.split(',').includes(userId)

    switch (action) {
      case 'trigger-scheduler':
        // Manually trigger the scheduler (admin only)
        if (!isAdmin) {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const scheduler = new JobScheduler()
        await scheduler.runScheduler()

        return NextResponse.json({ 
          success: true, 
          message: 'Scheduler triggered successfully' 
        })

      case 'process-jobs':
        // Manually process pending jobs (admin only)
        if (!isAdmin) {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        // Run one cycle of job processing
        const worker = new JobWorker()
        // We can't use the full start() method as it's infinite loop
        // Instead we'll run processJobs directly using reflection
        await (worker as any).processJobs()

        return NextResponse.json({ 
          success: true, 
          message: 'Job processing cycle completed' 
        })

      case 'cleanup-locks':
        // Clean up expired locks (admin only)
        if (!isAdmin) {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        await cleanupExpiredLocks()

        return NextResponse.json({ 
          success: true, 
          message: 'Expired locks cleaned up' 
        })

      case 'retry-failed':
        // Retry failed jobs (admin only)
        if (!isAdmin) {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const maxAge = body.max_age_hours || 24
        const retriedCount = await retryFailedJobs(maxAge)

        return NextResponse.json({ 
          success: true, 
          message: `${retriedCount} failed jobs queued for retry` 
        })

      case 'cancel-job':
        // Cancel a specific job (user can cancel their own jobs)
        const { job_id } = body
        if (!job_id) {
          return NextResponse.json({ error: 'job_id required' }, { status: 400 })
        }

        // Verify job ownership
        const { data: job, error: jobError } = await supabase
          .from('publish_jobs')
          .select(`
            id,
            state,
            schedules!inner(user_id)
          `)
          .eq('id', job_id)
          .single()

        if (jobError || !job) {
          return NextResponse.json({ error: 'Job not found' }, { status: 404 })
        }

        if (!isAdmin && job.schedules.user_id !== userId) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        if (!['queued', 'running'].includes(job.state)) {
          return NextResponse.json({ 
            error: 'Only queued or running jobs can be cancelled' 
          }, { status: 400 })
        }

        // Cancel the job
        const { error: cancelError } = await supabase
          .from('publish_jobs')
          .update({
            state: 'cancelled',
            finished_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', job_id)

        if (cancelError) {
          console.error('[jobs:post:cancel:error]', cancelError.message)
          return NextResponse.json({ error: 'Failed to cancel job' }, { status: 500 })
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Job cancelled successfully' 
        })

      case 'pause-schedule':
        // Pause a schedule (user can pause their own schedules)
        const { schedule_id } = body
        if (!schedule_id) {
          return NextResponse.json({ error: 'schedule_id required' }, { status: 400 })
        }

        // Verify schedule ownership
        const { data: schedule, error: scheduleError } = await supabase
          .from('schedules')
          .select('id, user_id, status')
          .eq('id', schedule_id)
          .single()

        if (scheduleError || !schedule) {
          return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
        }

        if (!isAdmin && schedule.user_id !== userId) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        if (schedule.status !== 'active') {
          return NextResponse.json({ 
            error: 'Only active schedules can be paused' 
          }, { status: 400 })
        }

        // Pause the schedule and cancel queued jobs
        await supabase
          .from('schedules')
          .update({
            status: 'paused',
            updated_at: new Date().toISOString()
          })
          .eq('id', schedule_id)

        await supabase
          .from('publish_jobs')
          .update({
            state: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('schedule_id', schedule_id)
          .eq('state', 'queued')

        return NextResponse.json({ 
          success: true, 
          message: 'Schedule paused and queued jobs cancelled' 
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error: any) {
    console.error('[jobs:post:exception]', error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}