// lib/marketplace.ts
// プロンプトマーケットのAPIレスポンスを安全に正規化するユーティリティ
// - 旧API(prompts) / 新API(items|data) のどれでも配列に揃える
// - 不足フィールドは補完（price_jpy / version / tags / is_published）
// - エラー時は空配列で返す（UIがクラッシュしない）

export type Prompt = {
  id: string
  prompt_id?: string
  name: string
  industry?: string
  purpose?: string
  format?: string
  description?: string
  is_free?: boolean
  is_active?: boolean
  is_published?: boolean
  price?: number
  price_jpy?: number
  version?: string
  tags?: string[]
  created_at?: string
}

export type PromptList = {
  items: Prompt[]
  total: number
  page: number
  limit: number
}

function coerceArray<T>(x: unknown): T[] {
  if (Array.isArray(x)) return x as T[]
  if (x == null) return []
  // APIが {prompts: {...}}（単体オブジェクト）になっても落ちないように配列化
  return [x as T]
}

export function normalizePromptsResponse(json: any): PromptList {
  // 旧/新どちらでも拾えるように優先順で取り出す
  const raw: any[] =
    coerceArray<Prompt>(json?.items).length ? coerceArray<Prompt>(json?.items) :
    coerceArray<Prompt>(json?.prompts).length ? coerceArray<Prompt>(json?.prompts) :
    coerceArray<Prompt>(json?.data)

  const items: Prompt[] = raw.map((p: any) => ({
    id: String(p.id ?? ''),
    prompt_id: p.prompt_id ?? p.id,
    name: String(p.name ?? ''),
    industry: p.industry ?? '',
    purpose: p.purpose ?? '',
    format: p.format ?? '',
    description: p.description ?? '',
    is_free: Boolean(p.is_free),
    is_active: p.is_active ?? p.is_published ?? true,
    is_published: (p.is_published ?? p.is_active) ?? true,
    price: Number(p.price ?? p.price_jpy ?? 0),
    price_jpy: Number(p.price_jpy ?? p.price ?? 0),
    version: p.version ?? 'v1.0',
    tags: Array.isArray(p.tags)
      ? p.tags.filter(Boolean)
      : [p.industry, p.format].filter(Boolean),
    created_at: p.created_at ?? undefined,
  })).filter(p => p.id && p.name) // 最低限の健全性チェック

  const total = Number(json?.total ?? items.length ?? 0)
  const page  = Number(json?.page ?? 1)
  const limit = Number(json?.limit ?? items.length ?? 30)

  return { items, total, page, limit }
}

export async function fetchPrompts(opts?: { page?: number; limit?: number; signal?: AbortSignal }) {
  const page  = opts?.page  ?? 1
  const limit = opts?.limit ?? 30
  try {
    const r = await fetch(`/api/prompts?page=${page}&limit=${limit}`, {
      cache: 'no-store',
      signal: opts?.signal,
      headers: { 'Accept': 'application/json' },
    })
    // サーバが500でも { items: [] } を返すケースがあるので、JSONは必ず読む
    const json = await r.json().catch(() => ({}))
    return normalizePromptsResponse(json)
  } catch (e) {
    // ネットワークエラー時でもUIを壊さない
    return { items: [], total: 0, page: 1, limit: 30 }
  }
}