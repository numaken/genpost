// app/api/metrics/dashboard/route.ts - Dashboard metrics API
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import { getMetrics } from '@/lib/telemetry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '14')
    
    const metrics = await getMetrics(session.user.id, days)
    
    return NextResponse.json({
      success: true,
      metrics,
      period: `過去${days}日間`,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Dashboard metrics error:', error)
    
    return NextResponse.json({
      error: 'metrics_failed',
      message: error.message || 'メトリクス取得に失敗しました'
    }, { status: 500 })
  }
}