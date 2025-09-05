import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { createClient } from '@supabase/supabase-js'
import { authOptions } from '../auth/[...nextauth]/route'
import { MessageContract, MessageContractWithStatus } from '@/lib/message-contracts'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function to check if user has purchased a contract
async function hasUserPurchased(userId: string, contractId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_message_contracts')
    .select('id')
    .eq('user_id', userId)
    .eq('contract_id', contractId)
    .eq('is_active', true)
    .single()

  return !!data && !error
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10), 1)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '30', 10), 1), 100)
    const debug = searchParams.get('debug') === '1'
    const from = (page - 1) * limit
    const to = from + limit - 1

    // Debug info
    if (debug) {
      const { data: debugCount } = await supabase
        .from('message_contracts')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
      
      return NextResponse.json({
        debug: true,
        supabaseHost: process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'unknown',
        activeCount: debugCount || 0,
        requestParams: { page, limit, from, to }
      })
    }

    // Get active contracts
    const { data, error, count } = await supabase
      .from('message_contracts')
      .select(`
        id,
        contract_id,
        name,
        speaker,
        claim,
        audience,
        benefit,
        proof,
        constraints,
        price,
        is_free,
        is_active,
        created_at,
        updated_at
      `, { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('[contracts:get:error]', error.message)
      return NextResponse.json({ items: [], error: 'fetch_failed' }, { status: 500 })
    }

    // Check session for purchase status
    const session = await getServerSession(authOptions)
    const userId = session?.user?.email

    // Process contracts with purchase status
    const items: MessageContractWithStatus[] = await Promise.all((data ?? []).map(async (contract: any) => {
      let purchased = false
      let available = true

      if (userId) {
        purchased = await hasUserPurchased(userId, contract.contract_id)
      }

      // Contract is available if free or purchased
      available = contract.is_free || purchased

      return {
        ...contract,
        purchased,
        available
      }
    }))

    // Group by speaker role for easier browsing
    const grouped = items.reduce((acc: any, contract: MessageContractWithStatus) => {
      const role = contract.speaker?.role || 'その他'
      if (!acc[role]) {
        acc[role] = []
      }
      acc[role].push(contract)
      return acc
    }, {})

    return NextResponse.json(
      { 
        items, 
        data: items, 
        contracts: items,
        grouped,
        total: count ?? items.length, 
        page, 
        limit 
      },
      { 
        status: 200, 
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } 
      }
    )
  } catch (e: any) {
    console.error('[contracts:get:exception]', e?.message || String(e))
    return NextResponse.json({ items: [], error: 'unexpected' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    const body = await req.json()
    const contract: Partial<MessageContract> = body

    // Validate required fields
    if (!contract.contract_id || !contract.name || !contract.speaker || !contract.claim || 
        !contract.audience || !contract.benefit || !contract.proof || !contract.constraints) {
      return NextResponse.json({ error: '必須フィールドが不足しています' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('message_contracts')
      .insert({
        contract_id: contract.contract_id,
        name: contract.name,
        speaker: contract.speaker,
        claim: contract.claim,
        audience: contract.audience,
        benefit: contract.benefit,
        proof: contract.proof,
        constraints: contract.constraints,
        price: contract.price || 0,
        is_free: contract.is_free || false,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('[contracts:post:error]', error.message)
      return NextResponse.json({ error: 'creation_failed' }, { status: 500 })
    }

    return NextResponse.json({ contract: data }, { status: 201 })
  } catch (e: any) {
    console.error('[contracts:post:exception]', e?.message || String(e))
    return NextResponse.json({ error: 'unexpected' }, { status: 500 })
  }
}