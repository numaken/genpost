// scripts/require-env.mjs
// ビルド前に「暗号鍵が無い/短い」ことを検知して失敗させる
const required = [
  ["API_KEY_ENCRYPTION_SECRET", v => typeof v === "string" && v.length >= 16, ">=16 chars required"]
]

let ok = true
for (const [name, validator, why] of required) {
  const v = process.env[name]
  if (!validator(v)) {
    console.error(`ENV ${name} invalid: ${why} (current: ${v ? `${v.length} chars` : "unset"})`)
    ok = false
  }
}
if (!ok) process.exit(1)