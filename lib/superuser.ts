// lib/superuser.ts - スーパーユーザー機能
export const SUPER_USER_EMAILS = [
  'numaken@gmail.com',
  // 必要に応じて追加
]

/**
 * スーパーユーザーかどうかを判定
 */
export function isSuperUser(email?: string | null): boolean {
  if (!email) return false
  return SUPER_USER_EMAILS.includes(email.toLowerCase())
}

/**
 * スーパーユーザー権限チェック（制限を無視）
 */
export function checkSuperUserLimits(email?: string | null) {
  if (isSuperUser(email)) {
    return {
      ok: true,
      used: 0,
      limit: 999999,
      plan: 'superuser',
      reason: 'スーパーユーザー権限'
    }
  }
  return null
}

/**
 * スーパーユーザー向け使用量表示
 */
export function getSuperUserUsage(email?: string | null) {
  if (isSuperUser(email)) {
    return {
      plan: 'SuperUser',
      used: 0,
      limit: '無制限',
      planId: 'superuser',
      features: [
        '無制限記事生成',
        '全モデルアクセス',
        'RAG機能フル活用',
        'Pack v1.1全種類',
        'デバッグ機能',
        '管理者権限'
      ]
    }
  }
  return null
}

/**
 * スーパーユーザー向けデバッグ情報取得
 */
export function getSuperUserDebugInfo() {
  return {
    environment: process.env.NODE_ENV,
    ragEnabled: process.env.PANO_RAG === '1',
    buildTime: new Date().toISOString(),
    features: {
      rag: true,
      telemetry: true,
      safeGenerate: true,
      packV11: true
    }
  }
}