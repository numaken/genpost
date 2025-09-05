import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { createClient } from '@supabase/supabase-js'
import { authOptions } from '../auth/[...nextauth]/route'
import { 
  MessageContract, 
  CreateContractRequest,
  MessageContractUpdate,
  DEFAULT_TONE,
  DEFAULT_CONSTRAINTS,
  DEFAULT_OUTPUT
} from '@/lib/contracts-v2'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================================================
// GET /api/contracts-v2 - List contracts
// ============================================================================
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10), 1)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '20', 10), 1), 100)
    const status = searchParams.get('status') || 'active'
    const structure = searchParams.get('structure') // PASONA or SDS filter
    
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('message_contracts')
      .select('*', { count: 'exact' })
      .eq('created_by', session.user.email)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (structure) {
      query = query.eq('structure', structure)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[contracts-v2:get:error]', error.message)
      return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 })
    }

    // Group contracts by industry/speaker role for easier browsing
    const grouped = (data || []).reduce((acc: any, contract: any) => {
      const role = contract.speaker?.role || 'その他'
      if (!acc[role]) {
        acc[role] = []
      }
      acc[role].push(contract)
      return acc
    }, {})

    return NextResponse.json({
      contracts: data || [],
      grouped,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error: any) {
    console.error('[contracts-v2:get:exception]', error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================================
// POST /api/contracts-v2 - Create contract
// ============================================================================
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body: CreateContractRequest = await req.json()

    // Validate required fields
    const requiredFields = ['contract_id', 'name', 'speaker', 'claim', 'audience', 'benefit', 'proof']
    for (const field of requiredFields) {
      if (!body[field as keyof CreateContractRequest]) {
        return NextResponse.json({ 
          error: `Missing required field: ${field}` 
        }, { status: 400 })
      }
    }

    // Validate speaker fields
    if (!body.speaker.role || !body.speaker.brand) {
      return NextResponse.json({
        error: 'Speaker must have role and brand'
      }, { status: 400 })
    }

    // Validate audience fields
    if (!body.audience.persona || !body.audience.jobs_to_be_done?.length) {
      return NextResponse.json({
        error: 'Audience must have persona and jobs_to_be_done'
      }, { status: 400 })
    }

    // Check for duplicate contract_id
    const { data: existing } = await supabase
      .from('message_contracts')
      .select('id')
      .eq('contract_id', body.contract_id)
      .eq('created_by', session.user.email)
      .single()

    if (existing) {
      return NextResponse.json({
        error: 'Contract ID already exists'
      }, { status: 409 })
    }

    // Create contract with defaults
    const contract: Partial<MessageContract> = {
      id: crypto.randomUUID(),
      contract_id: body.contract_id,
      contract_version: '1.0.0',
      status: 'active',
      speaker: body.speaker,
      claim: body.claim,
      audience: body.audience,
      benefit: body.benefit,
      proof: body.proof,
      tone: body.tone || DEFAULT_TONE,
      constraints: body.constraints || DEFAULT_CONSTRAINTS,
      output: body.output || DEFAULT_OUTPUT,
      magic_hints: body.magic_hints || [],
      created_by: session.user.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('message_contracts')
      .insert(contract)
      .select()
      .single()

    if (error) {
      console.error('[contracts-v2:post:error]', error.message)
      return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 })
    }

    return NextResponse.json({ contract: data }, { status: 201 })

  } catch (error: any) {
    console.error('[contracts-v2:post:exception]', error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================================
// PUT /api/contracts-v2 - Update contract
// ============================================================================
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await req.json()
    const { id, ...updateData }: { id: string } & MessageContractUpdate = body

    if (!id) {
      return NextResponse.json({ error: 'Contract ID required' }, { status: 400 })
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('message_contracts')
      .select('id, created_by')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    if (existing.created_by !== session.user.email) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update contract
    const { data, error } = await supabase
      .from('message_contracts')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[contracts-v2:put:error]', error.message)
      return NextResponse.json({ error: 'Failed to update contract' }, { status: 500 })
    }

    return NextResponse.json({ contract: data })

  } catch (error: any) {
    console.error('[contracts-v2:put:exception]', error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================================
// DELETE /api/contracts-v2 - Delete contract
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
      return NextResponse.json({ error: 'Contract ID required' }, { status: 400 })
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('message_contracts')
      .select('id, created_by')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    if (existing.created_by !== session.user.email) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if contract is being used by active schedules
    const { data: activeSchedules } = await supabase
      .from('schedules')
      .select('id')
      .eq('contract_id', existing.id)
      .eq('status', 'active')

    if (activeSchedules && activeSchedules.length > 0) {
      return NextResponse.json({
        error: 'Cannot delete contract: it is being used by active schedules'
      }, { status: 409 })
    }

    // Soft delete by updating status
    const { error } = await supabase
      .from('message_contracts')
      .update({ 
        status: 'archived',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('[contracts-v2:delete:error]', error.message)
      return NextResponse.json({ error: 'Failed to delete contract' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('[contracts-v2:delete:exception]', error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}