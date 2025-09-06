// server/publishEnhanced.ts - 統合記事生成・投稿パイプライン

import { JA_FRIEND_CASUAL } from '../lib/voicePrompt'
import { headingMapByVertical, VerticalKey } from '../lib/headingMapByVertical'
import { naturalizeHeadings } from '../lib/naturalizeHeadings'
import { ruleFilter, pickWeirdSentences } from '../lib/humanizeJa'
import { jpPolish } from '../lib/jpPolish'
import { simhash, hamming } from '../lib/simhash'
import { UCB1 } from '../lib/bandit'
import { critiqueAndRevise, GenFn } from '../lib/critiqueAndRevise'

type PublishOptions = {
  siteId: string
  vertical?: VerticalKey
  naturalizeTitle?: boolean
  stripLeadingH1?: boolean
  simhashThreshold?: number // 例: 6
}

// ダミー: 既存記事のSimHashを読み込む想定
async function loadRecentSimHashes(siteId: string): Promise<bigint[]> {
  return [] // 実装はあなたのDBに合わせて
}

// ダミー: WP投稿クライアント
async function postToWordPress(siteId: string, payload: { title: string; content: string }) {
  // 実装は既存の wpClient を呼ぶ
  return { ok: true, postId: 123, ...payload }
}

export async function publishEnhanced(gen: GenFn, params: {
  siteId: string
  title: string
  contentPrompt: string // LLMへ渡すユーザープロンプト
  options?: PublishOptions
}) {
  const { siteId, title, contentPrompt } = params
  const opt = { simhashThreshold: 6, stripLeadingH1: true, vertical: 'common' as VerticalKey, ...params.options }

  // 1) Draft→Critique→Revise で"AIくささ"を軽減
  let draft = await critiqueAndRevise(gen, JA_FRIEND_CASUAL, contentPrompt)

  // 2) 見出し自然化（業種別マップ）
  const map = { ...headingMapByVertical.common, ...(headingMapByVertical[opt.vertical!] || {}) }
  draft = naturalizeHeadings(draft, map)

  // 3) 人肌フィルタ（ルール）→ 変な文が残っていればLLMでピンポイント言い換え（任意）
  draft = ruleFilter(draft)
  const weirds = pickWeirdSentences(draft)
  if (weirds.length) {
    const patched = await gen([
      { role: 'system', content: '次の文だけ自然に言い換えて。意味は変えず、短く。' },
      { role: 'user', content: weirds.map(s => `- ${s}`).join('\n') }
    ])
    // 極小置換：weird文→LLM返答（箇条書き想定）
    const lines = patched.split(/\n/).map(s => s.replace(/^[-・]\s?/, '').trim()).filter(Boolean)
    weirds.forEach((w, i) => { if (lines[i]) draft = draft.replace(w, lines[i]) })
  }

  // 4) 日本語ポリッシュ
  draft = jpPolish(draft)

  // 5) 重複チェック（SimHash）
  const newsig = simhash(draft)
  const oldsigs = await loadRecentSimHashes(siteId)
  for (const s of oldsigs) {
    if (hamming(newsig, s) <= (opt.simhashThreshold ?? 6)) {
      throw new Error('内容が既存記事と類似しています（再生成を推奨）')
    }
  }

  // 6) タイトル自然化（任意） & 先頭H1除去（WPで二重見出し回避）
  let finalTitle = title
  if (opt.naturalizeTitle) {
    finalTitle = naturalizeHeadings(`# ${title}`, map).replace(/^#\s*/, '')
  }
  if (opt.stripLeadingH1) {
    draft = draft.replace(/^\s*#\s*[^\n]+\n+/, '').replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i, '')
  }

  // 7) （任意）バンディット候補：H1/CTAの文言を選ぶ（ここではUCB1の器だけ提示）
  // const ucb = new UCB1(['cta_a','cta_b','cta_c']); const picked = ucb.pick(); // 使い方例

  // 8) 投稿
  const res = await postToWordPress(siteId, { title: finalTitle, content: draft })
  return res
}