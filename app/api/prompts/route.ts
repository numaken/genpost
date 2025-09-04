import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { redact } from '@/lib/redact'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10), 1)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '30', 10), 1), 100)
    const from = (page - 1) * limit
    const to = from + limit - 1

    // 公開分のみ（未ログインでもOK） + 件数
    const { data, error, count } = await supabase
      .from('prompts')
      .select(
        [
          'id',
          'prompt_id',
          'name',
          'industry',
          'purpose',
          'format',
          'description',
          'price',
          'is_free',
          'is_active',
          'created_at'
        ].join(','),
        { count: 'exact' }
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('[prompts:get:error]', redact(error.message))
      return NextResponse.json({ items: [], error: 'fetch_failed' }, { status: 500 })
    }

    // UI互換のため、足りないフィールドを補完（price_jpy/version/tags/is_published）
    const items = (data ?? []).map((p: any) => ({
      id: p.id,
      prompt_id: p.prompt_id,
      name: p.name,
      industry: p.industry,
      purpose: p.purpose,
      format: p.format,
      description: p.description,
      is_free: !!p.is_free,
      is_active: !!p.is_active,
      is_published: !!p.is_active,      // ← UIが is_published を見る場合の互換
      price: Number(p.price ?? 0),
      price_jpy: Number(p.price ?? 0),   // ← UIが price_jpy を見る場合の互換
      version: 'v1.0',                   // ← CSVになくても表示用の既定値
      tags: [p.industry, p.format].filter(Boolean), // ← 簡易タグ
      created_at: p.created_at
    }))

    return NextResponse.json(
      { items, data: items, total: count ?? items.length, page, limit },
      { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    )
  } catch (e: any) {
    console.error('[prompts:get:exception]', redact(e?.message || String(e)))
    return NextResponse.json({ items: [], error: 'unexpected' }, { status: 500 })
  }
}