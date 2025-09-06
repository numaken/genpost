// app/api/pack-versions/route.ts - Pack version management API
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface PackVersionInfo {
  type: string
  name: string
  versions: Array<{
    version: string
    description: string
    available: boolean
    features: string[]
  }>
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    // Pack version情報を返す
    const packVersions: PackVersionInfo[] = [
      {
        type: 'general',
        name: '汎用パック',
        versions: [
          {
            version: 'v1.0',
            description: '基本機能',
            available: true,
            features: ['基本見出し自然化', '人肌フィルタ']
          }
        ]
      },
      {
        type: 'restaurant',
        name: '飲食店パック',
        versions: [
          {
            version: 'v1.0',
            description: '基本版',
            available: true,
            features: ['飲食店特化見出し', '店舗向け表現']
          },
          {
            version: 'v1.1',
            description: 'アップデート版',
            available: true,
            features: ['来店促進強化', '数字重視表現', '販促臭軽減']
          }
        ]
      },
      {
        type: 'beauty',
        name: '美容パック',
        versions: [
          {
            version: 'v1.0',
            description: '基本版',
            available: true,
            features: ['美容特化見出し', '親しみやすい表現']
          },
          {
            version: 'v1.1',
            description: 'アップデート版',
            available: true,
            features: ['実感重視表現', 'ケア習慣提案', '専門性強化']
          }
        ]
      },
      {
        type: 'saas',
        name: 'SaaSパック',
        versions: [
          {
            version: 'v1.0',
            description: '基本版',
            available: true,
            features: ['IT特化見出し', '効率化訴求']
          },
          {
            version: 'v1.1',
            description: 'アップデート版',
            available: true,
            features: ['現場感強化', 'ROI重視', '専門用語適正化']
          }
        ]
      }
    ]

    return NextResponse.json({
      success: true,
      packVersions,
      note: 'v1.1は軽微な改善版です'
    })

  } catch (error: any) {
    console.error('Pack versions API error:', error)
    
    return NextResponse.json({
      error: 'pack_versions_failed',
      message: error.message || 'Packバージョン情報の取得に失敗しました'
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
    const { packType, version } = body

    // バージョン選択をセッション/DBに保存
    // 簡易実装：環境変数で管理
    process.env[`USER_PACK_VERSION_${session.user.id}_${packType}`] = version

    return NextResponse.json({
      success: true,
      message: `${packType} ${version}を選択しました`,
      selectedVersion: {
        packType,
        version
      }
    })

  } catch (error: any) {
    console.error('Pack version selection error:', error)
    
    return NextResponse.json({
      error: 'version_selection_failed',
      message: error.message || 'バージョン選択に失敗しました'
    }, { status: 500 })
  }
}