// scripts/seed-prompts-from-csv.mjs
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// ---- 設定 ----
const CSV_PATH = process.argv[2] || './prompts_rows.csv'
const CHUNK_SIZE = 500              // まとめてUpsertする件数
const TABLE = 'prompts'
const ON_CONFLICT = 'prompt_id'     // 既存行があれば上書き

// .env.local を補助的に読み込む（dotenv優先）
try {
  const envPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const text = fs.readFileSync(envPath, 'utf8')
    for (const line of text.split('\n')) {
      if (!line || line.trim().startsWith('#') || !line.includes('=')) continue
      const [k, ...rest] = line.split('=')
      if (!process.env[k.trim()]) process.env[k.trim()] = rest.join('=').trim()
    }
  }
} catch {}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !service) {
  console.error('ENV missing: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supabase = createClient(url, service)

// CSV→行配列へ（簡易パーサ。カンマ含有や改行は事前整形を推奨）
function parseCSV(csv) {
  const [head, ...rows] = csv.split(/\r?\n/).filter(Boolean)
  const cols = head.split(',').map(s => s.trim())
  return rows.map(r => {
    // ざっくりCSV（ダブルクオート無し想定）。必要に応じて robust なCSVパーサに差し替え可
    const vals = r.split(',').map(s => s.trim())
    const obj = {}
    cols.forEach((c, i) => (obj[c] = vals[i] ?? null))
    return obj
  })
}

// 型整形（boolean/number/json/date）
function normalizeRow(x) {
  const b = (v) => {
    if (typeof v === 'boolean') return v
    if (v === 'true' || v === '1' || v === 1) return true
    return false
  }
  const n = (v) => (v == null || v === '' ? null : Number(v))
  const j = (v) => {
    if (!v) return {}
    try { return typeof v === 'string' ? JSON.parse(v) : v } catch { return {} }
  }
  const d = (v) => (v && !isNaN(Date.parse(v)) ? new Date(v).toISOString() : new Date().toISOString())

  return {
    id: x.id && x.id.length ? x.id : undefined, // uuidはDBデフォルトに任せてもOK
    prompt_id: x.prompt_id,
    industry: x.industry,
    purpose: x.purpose,
    format: x.format,
    name: x.name,
    description: x.description,
    price: n(x.price),
    is_free: b(x.is_free),
    system_prompt: x.system_prompt,
    user_prompt_template: x.user_prompt_template,
    gen_config: j(x.gen_config),
    is_active: b(x.is_active ?? 'true'),
    created_at: d(x.created_at),
    updated_at: d(x.updated_at),
  }
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error('CSV not found:', CSV_PATH)
    process.exit(1)
  }
  const csv = fs.readFileSync(CSV_PATH, 'utf8')
  const rowsRaw = parseCSV(csv)
  const rows = rowsRaw.map(normalizeRow)

  console.log(`Parsed ${rows.length} rows. Upserting in chunks of ${CHUNK_SIZE}...`)
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE)
    const { error, count } = await supabase
      .from(TABLE)
      .upsert(chunk, { onConflict: ON_CONFLICT, ignoreDuplicates: false, count: 'exact' })
    if (error) {
      console.error(`Upsert error at chunk ${i}-${i + chunk.length - 1}:`, error)
      process.exit(1)
    }
    console.log(`Upserted ${chunk.length} rows`)
  }
  console.log('All done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})