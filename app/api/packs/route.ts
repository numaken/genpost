// app/api/packs/route.ts - Pack一覧取得API

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { getAvailablePacks, getUserPacks, checkPackEntitlement } from '@/lib/packSystem'
import { authOptions } from '../auth/[...nextauth]/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const vertical = searchParams.get('vertical')
    const onlyOwned = searchParams.get('owned') === 'true'

    let packs
    
    if (onlyOwned && session?.user?.id) {
      // ユーザー所有Pack一覧
      packs = await getUserPacks(session.user.id)
    } else {
      // 利用可能Pack一覧
      packs = await getAvailablePacks(session?.user?.id, vertical as any)
    }

    // ユーザーの所有状況をチェック
    if (session?.user?.id && !onlyOwned) {
      const packsWithOwnership = await Promise.all(
        packs.map(async (pack) => {
          const isOwned = await checkPackEntitlement(session.user.id, pack.id)
          return { ...pack, isOwned }
        })
      )
      packs = packsWithOwnership
    }

    return NextResponse.json({
      success: true,
      packs: packs.map(pack => {
        const isOwned = (pack as any).isOwned
        return {
          ...pack,
          // セキュリティ: Pack内容の詳細は所有者のみに提供
          assets: isOwned || pack.price === 0 ? pack.assets : {
            // プレビュー情報のみ
            voice: pack.assets.voice ? { preview: '専用ボイスプロンプト含む' } : undefined,
            heading: pack.assets.heading ? { preview: '業種別見出し変換含む' } : undefined,
            humanize: pack.assets.humanize ? { preview: '人肌化ルール含む' } : undefined,
          }
        }
      })
    })

  } catch (error: any) {
    console.error('Packs API error:', error)
    return NextResponse.json({
      error: 'Pack一覧の取得に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, type, vertical, price, assets } = body

    // Admin権限チェック（実装に応じて調整）
    const isAdmin = session.user.email?.endsWith('@panolabollc.com') || false
    if (!isAdmin) {
      return NextResponse.json({ error: 'Pack作成権限がありません' }, { status: 403 })
    }

    // Pack作成ロジック（実装省略）
    // const packId = await createPack({ name, description, type, vertical, price, assets })

    return NextResponse.json({
      success: true,
      message: 'Pack作成機能は未実装です'
    })

  } catch (error: any) {
    console.error('Pack creation error:', error)
    return NextResponse.json({
      error: 'Pack作成に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}