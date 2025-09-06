// app/api/user-plan/route.ts - ユーザープラン情報API

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { getUserPlanInfo } from '@/lib/subscription'
import { authOptions } from '../auth/[...nextauth]/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const planInfo = await getUserPlanInfo(session.user.id)

    return NextResponse.json({
      success: true,
      ...planInfo
    })

  } catch (error: any) {
    console.error('User plan API error:', error)
    return NextResponse.json({
      error: 'プラン情報の取得に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}