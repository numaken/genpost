/**
 * GenPost v2: Job Scheduler & Worker System
 * Handles automated article generation and WordPress publishing
 */

import { createClient } from '@supabase/supabase-js'
import { 
  Schedule, 
  PublishJob, 
  JobWorkerConfig, 
  JobLock,
  GenerationRequest,
  MessageContract,
  GeneratedArticle,
  WordPressPublishRequest,
  WordPressPublishResponse
} from './contracts-v2'
import { PromptEngineV2 } from './prompt-engine-v2'
import { getUserApiKey } from './api-keys'
import { canUseSharedApiKey, incrementUsage } from './usage-limits'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================================================
// Job Scheduler - Creates jobs from active schedules
// ============================================================================

export class JobScheduler {
  private config: JobWorkerConfig

  constructor(config: Partial<JobWorkerConfig> = {}) {
    this.config = {
      worker_id: config.worker_id || crypto.randomUUID(),
      max_concurrent_jobs: config.max_concurrent_jobs || 3,
      lock_timeout_minutes: config.lock_timeout_minutes || 10,
      retry_exponential_base: config.retry_exponential_base || 2,
      max_retry_delay_minutes: config.max_retry_delay_minutes || 120
    }
  }

  /**
   * Main scheduler loop - check for due schedules and create jobs
   */
  async runScheduler(): Promise<void> {
    console.log(`[scheduler:${this.config.worker_id}] Starting scheduler check`)

    try {
      // Get active schedules that are due for generation
      const { data: dueSchedules, error } = await supabase
        .from('schedules')
        .select(`
          *,
          wordpress_sites!inner(site_name, site_url, wp_username, wp_password)
        `)
        .eq('status', 'active')
        .lte('next_generation_at', new Date().toISOString())
        .limit(50)

      if (error) {
        console.error('[scheduler:error]', error.message)
        return
      }

      if (!dueSchedules || dueSchedules.length === 0) {
        console.log('[scheduler] No due schedules found')
        return
      }

      console.log(`[scheduler] Found ${dueSchedules.length} due schedules`)

      // Process each due schedule
      for (const schedule of dueSchedules) {
        await this.processSchedule(schedule)
      }

    } catch (error: any) {
      console.error('[scheduler:exception]', error.message)
    }
  }

  /**
   * Process a single schedule - create job and update next execution time
   */
  private async processSchedule(schedule: Schedule): Promise<void> {
    try {
      // Generate keyword combination for this job
      const keywordSet = await this.getNextKeywordSet(schedule)
      
      if (!keywordSet || keywordSet.length === 0) {
        console.log(`[scheduler] No keywords available for schedule ${schedule.id}`)
        return
      }

      // Create publish job
      const job: Partial<PublishJob> = {
        id: crypto.randomUUID(),
        schedule_id: schedule.id,
        planned_at: new Date().toISOString(),
        state: 'queued',
        retry_count: 0,
        max_retries: 3,
        keywords_used: keywordSet,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error: jobError } = await supabase
        .from('publish_jobs')
        .insert(job)

      if (jobError) {
        console.error(`[scheduler] Failed to create job for schedule ${schedule.id}:`, jobError.message)
        return
      }

      // Calculate next execution time
      const nextExecution = this.parseNextExecution(schedule.cron, schedule.tz)
      
      // Update schedule
      const { error: scheduleError } = await supabase
        .from('schedules')
        .update({
          last_generated_at: new Date().toISOString(),
          next_generation_at: nextExecution,
          current_keyword_index: schedule.current_keyword_index + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', schedule.id)

      if (scheduleError) {
        console.error(`[scheduler] Failed to update schedule ${schedule.id}:`, scheduleError.message)
      } else {
        console.log(`[scheduler] Created job ${job.id} for schedule ${schedule.id}`)
      }

    } catch (error: any) {
      console.error(`[scheduler] Error processing schedule ${schedule.id}:`, error.message)
    }
  }

  /**
   * Get next keyword combination for a schedule
   */
  private async getNextKeywordSet(schedule: Schedule): Promise<string[] | null> {
    const { keyword_pool, used_keyword_sets, current_keyword_index } = schedule
    
    if (!keyword_pool || keyword_pool.length < 3) {
      return null
    }

    // Generate all possible 3-keyword combinations
    const combinations = this.generateKeywordCombinations(keyword_pool, 3)
    
    if (combinations.length === 0) {
      return null
    }

    // Use round-robin to cycle through combinations
    const targetIndex = current_keyword_index % combinations.length
    const selectedSet = combinations[targetIndex]

    // Check if this combination was recently used (avoid within last 5 uses)
    const recentlyUsed = used_keyword_sets.slice(-5)
    const isRecentlyUsed = recentlyUsed.some(usedSet => 
      usedSet.length === selectedSet.length && 
      usedSet.every(keyword => selectedSet.includes(keyword))
    )

    if (isRecentlyUsed && combinations.length > 5) {
      // Try next combination
      const nextIndex = (current_keyword_index + 1) % combinations.length
      return combinations[nextIndex]
    }

    // Update used keyword sets
    const updatedUsedSets = [...used_keyword_sets, selectedSet].slice(-20) // Keep last 20

    await supabase
      .from('schedules')
      .update({ 
        used_keyword_sets: updatedUsedSets,
        updated_at: new Date().toISOString()
      })
      .eq('id', schedule.id)

    return selectedSet
  }

  /**
   * Generate keyword combinations
   */
  private generateKeywordCombinations(keywords: string[], size: number = 3): string[][] {
    if (keywords.length < size) {
      return [keywords]
    }

    const combinations: string[][] = []
    
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

  /**
   * Parse cron and calculate next execution
   */
  private parseNextExecution(cron: string, tz: string = 'Asia/Tokyo'): string {
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
}

// ============================================================================
// Job Worker - Executes pending jobs
// ============================================================================

export class JobWorker {
  private config: JobWorkerConfig
  private running = false

  constructor(config: Partial<JobWorkerConfig> = {}) {
    this.config = {
      worker_id: config.worker_id || crypto.randomUUID(),
      max_concurrent_jobs: config.max_concurrent_jobs || 3,
      lock_timeout_minutes: config.lock_timeout_minutes || 10,
      retry_exponential_base: config.retry_exponential_base || 2,
      max_retry_delay_minutes: config.max_retry_delay_minutes || 120
    }
  }

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.running) {
      console.log(`[worker:${this.config.worker_id}] Already running`)
      return
    }

    this.running = true
    console.log(`[worker:${this.config.worker_id}] Starting job worker`)

    while (this.running) {
      try {
        await this.processJobs()
        await this.sleep(30000) // Check every 30 seconds
      } catch (error: any) {
        console.error('[worker:exception]', error.message)
        await this.sleep(60000) // Wait 1 minute on error
      }
    }
  }

  /**
   * Stop the worker
   */
  stop(): void {
    console.log(`[worker:${this.config.worker_id}] Stopping job worker`)
    this.running = false
  }

  /**
   * Process pending jobs
   */
  private async processJobs(): Promise<void> {
    // Get pending jobs (oldest first)
    const { data: jobs, error } = await supabase
      .from('publish_jobs')
      .select(`
        *,
        schedules!inner(
          user_id,
          contract_id,
          wp_site_url,
          category_slug,
          post_status
        )
      `)
      .eq('state', 'queued')
      .lte('planned_at', new Date().toISOString())
      .order('planned_at', { ascending: true })
      .limit(this.config.max_concurrent_jobs * 2)

    if (error) {
      console.error('[worker:error]', error.message)
      return
    }

    if (!jobs || jobs.length === 0) {
      return
    }

    console.log(`[worker] Found ${jobs.length} pending jobs`)

    // Process jobs with concurrency limit
    const jobPromises = jobs
      .slice(0, this.config.max_concurrent_jobs)
      .map(job => this.processJob(job))

    await Promise.all(jobPromises)
  }

  /**
   * Process a single job
   */
  private async processJob(job: any): Promise<void> {
    const lockKey = `job_${job.id}`
    
    try {
      // Acquire lock
      const lockAcquired = await this.acquireLock(lockKey)
      if (!lockAcquired) {
        return
      }

      console.log(`[worker] Processing job ${job.id}`)

      // Mark job as running
      await supabase
        .from('publish_jobs')
        .update({
          state: 'running',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id)

      // Execute job
      await this.executeJob(job)

      // Release lock
      await this.releaseLock(lockKey)

    } catch (error: any) {
      console.error(`[worker] Job ${job.id} failed:`, error.message)
      
      // Handle retry logic
      await this.handleJobFailure(job, error)
      
      // Release lock
      await this.releaseLock(lockKey)
    }
  }

  /**
   * Execute job - generate article and publish to WordPress
   */
  private async executeJob(job: any): Promise<void> {
    const { schedules: schedule } = job
    
    // Get contract
    const { data: contract, error: contractError } = await supabase
      .from('message_contracts')
      .select('*')
      .eq('contract_id', schedule.contract_id)
      .eq('status', 'active')
      .single()

    if (contractError || !contract) {
      throw new Error('Contract not found or inactive')
    }

    // Get API key
    const userApiKey = await getUserApiKey(schedule.user_id, 'openai')
    let apiKey = userApiKey

    if (!userApiKey) {
      const usage = await canUseSharedApiKey(schedule.user_id)
      if (!usage.canUse) {
        throw new Error(`API usage limit exceeded: ${usage.reason}`)
      }
      
      apiKey = process.env.OPENAI_API_KEY!
    }

    if (!apiKey) {
      throw new Error('No API key available')
    }

    // Generate article
    const engine = new PromptEngineV2(apiKey)
    const genRequest: GenerationRequest = {
      contract: contract as MessageContract,
      keywords: job.keywords_used,
      model: 'gpt-4o-mini',
      max_retries: 2
    }

    const result = await engine.generateArticle(genRequest)

    // Publish to WordPress
    const wpRequest: WordPressPublishRequest = {
      title: result.article.title,
      content: result.article.content,
      category_slug: schedule.category_slug,
      status: schedule.post_status,
      meta_description: result.article.meta_description,
      tags: result.article.secondary_keywords
    }

    const wpResult = await this.publishToWordPress(schedule.wp_site_url, wpRequest)

    // Save article to database
    const articleData: Partial<GeneratedArticle> = {
      ...result.article,
      user_id: schedule.user_id,
      schedule_id: job.schedule_id,
      job_id: job.id,
      wp_post_id: wpResult.post_id,
      generation_audit_id: result.audit.id
    }

    const { error: articleError } = await supabase
      .from('generated_articles')
      .insert(articleData)

    if (articleError) {
      console.error('Failed to save article:', articleError)
    }

    // Save audit
    const { error: auditError } = await supabase
      .from('generation_audit')
      .insert({
        ...result.audit,
        user_id: schedule.user_id,
        job_id: job.id
      })

    if (auditError) {
      console.error('Failed to save audit:', auditError)
    }

    // Update job as completed
    await supabase
      .from('publish_jobs')
      .update({
        state: 'completed',
        finished_at: new Date().toISOString(),
        article_title: result.article.title,
        article_id: result.article.id,
        wp_post_id: wpResult.post_id,
        wp_post_url: wpResult.post_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)

    // Increment usage if using shared API
    if (!userApiKey) {
      await incrementUsage(schedule.user_id, true)
    }

    console.log(`[worker] Job ${job.id} completed successfully`)
  }

  /**
   * Publish article to WordPress
   */
  private async publishToWordPress(
    siteUrl: string, 
    request: WordPressPublishRequest
  ): Promise<WordPressPublishResponse> {
    try {
      // Get WordPress site credentials from database
      const { data: wpSite, error: wpError } = await supabase
        .from('wordpress_sites')
        .select('wp_api_key')
        .eq('site_url', siteUrl)
        .single()

      if (wpError || !wpSite || !wpSite.wp_api_key) {
        throw new Error('WordPress site not found or missing API key')
      }

      // Ensure siteUrl has proper format
      const baseUrl = siteUrl.replace(/\/$/, '') // Remove trailing slash
      const apiUrl = `${baseUrl}/wp-json/genpost/v2/publish`

      // Make API call to WordPress GenPost Bridge plugin
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${wpSite.wp_api_key}`,
          'User-Agent': 'GenPost-Worker/2.0'
        },
        body: JSON.stringify({
          title: request.title,
          content: request.content,
          category_slug: request.category_slug,
          featured_image_url: request.featured_image_url,
          status: request.status,
          meta_description: request.meta_description,
          tags: request.tags
        }),
        // 30 second timeout
        signal: AbortSignal.timeout(30000)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(
          `WordPress API error (${response.status}): ${
            errorData?.message || response.statusText
          }`
        )
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(`WordPress publish failed: ${result.message || 'Unknown error'}`)
      }

      return {
        success: true,
        post_id: result.post_id,
        post_url: result.post_url
      }

    } catch (error: any) {
      // Log the error for debugging
      console.error(`[worker] WordPress publish failed for ${siteUrl}:`, error.message)
      
      // Re-throw with more context
      if (error.name === 'AbortError') {
        throw new Error('WordPress API request timed out')
      } else if (error.message.includes('fetch')) {
        throw new Error(`Cannot connect to WordPress site: ${error.message}`)
      } else {
        throw error
      }
    }
  }

  /**
   * Handle job failure and retry logic
   */
  private async handleJobFailure(job: any, error: Error): Promise<void> {
    const newRetryCount = job.retry_count + 1
    
    if (newRetryCount >= job.max_retries) {
      // Mark as permanently failed
      await supabase
        .from('publish_jobs')
        .update({
          state: 'failed',
          finished_at: new Date().toISOString(),
          error_message: error.message,
          error_details: { stack: error.stack },
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id)
      
      console.log(`[worker] Job ${job.id} permanently failed after ${newRetryCount} attempts`)
      return
    }

    // Calculate retry delay (exponential backoff)
    const baseDelay = Math.pow(this.config.retry_exponential_base, newRetryCount - 1) * 60 * 1000 // minutes to ms
    const maxDelay = this.config.max_retry_delay_minutes * 60 * 1000
    const retryDelay = Math.min(baseDelay, maxDelay)
    
    const retryAt = new Date(Date.now() + retryDelay)

    // Mark for retry
    await supabase
      .from('publish_jobs')
      .update({
        state: 'queued',
        planned_at: retryAt.toISOString(),
        retry_count: newRetryCount,
        error_message: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)

    console.log(`[worker] Job ${job.id} scheduled for retry ${newRetryCount}/${job.max_retries} at ${retryAt.toISOString()}`)
  }

  /**
   * Acquire distributed lock
   */
  private async acquireLock(lockKey: string): Promise<boolean> {
    const expiresAt = new Date(Date.now() + this.config.lock_timeout_minutes * 60 * 1000)
    
    try {
      const { error } = await supabase
        .from('job_locks')
        .insert({
          lock_key: lockKey,
          locked_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          locked_by: this.config.worker_id
        })

      return !error
    } catch {
      return false // Lock already exists
    }
  }

  /**
   * Release distributed lock
   */
  private async releaseLock(lockKey: string): Promise<void> {
    await supabase
      .from('job_locks')
      .delete()
      .eq('lock_key', lockKey)
      .eq('locked_by', this.config.worker_id)
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// ============================================================================
// Job Management API
// ============================================================================

/**
 * Get job statistics for monitoring
 */
export async function getJobStats(): Promise<any> {
  const { data: stats } = await supabase
    .from('publish_jobs')
    .select('state')
    
  const summary = (stats || []).reduce((acc: any, job: any) => {
    acc[job.state] = (acc[job.state] || 0) + 1
    return acc
  }, {})

  return {
    total: stats?.length || 0,
    by_state: summary,
    timestamp: new Date().toISOString()
  }
}

/**
 * Clean up expired locks
 */
export async function cleanupExpiredLocks(): Promise<void> {
  await supabase
    .from('job_locks')
    .delete()
    .lt('expires_at', new Date().toISOString())
}

/**
 * Retry failed jobs (manual intervention)
 */
export async function retryFailedJobs(maxAge: number = 24): Promise<number> {
  const cutoff = new Date(Date.now() - maxAge * 60 * 60 * 1000) // hours ago
  
  const { data: failedJobs } = await supabase
    .from('publish_jobs')
    .select('id')
    .eq('state', 'failed')
    .gte('updated_at', cutoff.toISOString())

  if (!failedJobs || failedJobs.length === 0) {
    return 0
  }

  const { error } = await supabase
    .from('publish_jobs')
    .update({
      state: 'queued',
      retry_count: 0,
      error_message: null,
      error_details: null,
      updated_at: new Date().toISOString()
    })
    .in('id', failedJobs.map(job => job.id))

  if (error) {
    throw new Error(`Failed to retry jobs: ${error.message}`)
  }

  return failedJobs.length
}