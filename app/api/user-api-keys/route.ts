import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { saveUserApiKey, getUserApiKey, deleteUserApiKey, hasUserApiKey } from '@/lib/api-keys'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    const userId = session.user.email
    const { searchParams } = new URL(request.url)
    const service = searchParams.get('service') || 'openai'

    // APIキーが設定されているかのみ返す（セキュリティのため実際のキーは返さない）
    const hasKey = await hasUserApiKey(userId, service)
    
    return NextResponse.json({
      hasApiKey: hasKey,
      service: service
    })

  } catch (error) {
    console.error('API key check error:', error)
    return NextResponse.json({ 
      error: 'APIキーの確認に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    const userId = session.user.email
    const body = await request.json()
    const { apiKey, service = 'openai' } = body

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'APIキーが必要です' }, { status: 400 })
    }

    // OpenAI APIキーの形式チェック
    if (service === 'openai' && !apiKey.startsWith('sk-')) {
      return NextResponse.json({ error: 'OpenAI APIキーの形式が正しくありません（sk-で始まる必要があります）' }, { status: 400 })
    }

    await saveUserApiKey(userId, service, apiKey)

    return NextResponse.json({
      success: true,
      message: `${service} APIキーを保存しました`
    })

  } catch (error) {
    console.error('API key save error:', error)
    return NextResponse.json({ 
      error: 'APIキーの保存に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    const userId = session.user.email
    const { searchParams } = new URL(request.url)
    const service = searchParams.get('service') || 'openai'

    await deleteUserApiKey(userId, service)

    return NextResponse.json({
      success: true,
      message: `${service} APIキーを削除しました`
    })

  } catch (error) {
    console.error('API key delete error:', error)
    return NextResponse.json({ 
      error: 'APIキーの削除に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}