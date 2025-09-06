// server/publishEnhancedWithPacks.ts - Pack対応統合記事生成・投稿パイプライン

import { JA_FRIEND_CASUAL } from '../lib/voicePrompt'
import { headingMapByVertical, VerticalKey } from '../lib/headingMapByVertical'
import { naturalizeHeadings } from '../lib/naturalizeHeadings'
import { ruleFilter, pickWeirdSentences } from '../lib/humanizeJa'
import { jpPolish } from '../lib/jpPolish'
import { simhash, hamming } from '../lib/simhash'
import { critiqueAndRevise, GenFn } from '../lib/critiqueAndRevise'
import { getEntitledPack, recordPackUsage, type Pack } from '../lib/packSystem'

type PublishOptions = {
  siteId: string
  vertical?: VerticalKey
  naturalizeTitle?: boolean
  stripLeadingH1?: boolean
  simhashThreshold?: number
  packId?: string // 👈 NEW: Pack指定
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

/**
 * Packの設定をマージ（優先順位: Pack > オプション > デフォルト）
 */
function mergePackSettings(pack: Pack | null, options: PublishOptions) {
  const defaults = {
    voice: JA_FRIEND_CASUAL,
    headingMap: { ...headingMapByVertical.common, ...(headingMapByVertical[options.vertical || 'common'] || {}) },
    humanizeRules: [], // デフォルトルール
    flowRubric: '以下の観点で短く指摘: 1) 紋切り句 2) 冗長 3) 見出しの弱さ 4) 曖昧表現。本文を書き換えず、箇条書きで具体箇所だけ列挙。',
    temperature: 0.4,
    maxTokens: 4000
  }

  if (!pack) return defaults

  return {
    voice: pack.assets.voice?.system || defaults.voice,
    headingMap: pack.assets.heading?.map || defaults.headingMap,
    humanizeRules: pack.assets.humanize?.rules || defaults.humanizeRules,
    flowRubric: pack.assets.flow?.critiqueRubric || defaults.flowRubric,
    temperature: pack.assets.voice?.temperature || defaults.temperature,
    maxTokens: pack.assets.voice?.maxTokens || defaults.maxTokens,
    useLLMHumanize: pack.assets.humanize?.useLLM !== false,
    enableSchemaOrg: pack.assets.meta?.schemaOrg || false
  }
}

/**
 * Pack対応版publishEnhanced
 */
export async function publishEnhancedWithPacks(
  gen: GenFn,
  userId: string,
  params: {
    siteId: string
    title: string
    contentPrompt: string
    options?: PublishOptions
  }
) {
  const { siteId, title, contentPrompt } = params
  const opt = { 
    simhashThreshold: 6, 
    stripLeadingH1: true, 
    vertical: 'common' as VerticalKey, 
    ...params.options 
  }

  // 👈 NEW: Pack取得（権限チェック付き）
  let pack: Pack | null = null
  if (opt.packId) {
    pack = await getEntitledPack(userId, opt.packId)
    if (!pack) {
      throw new Error('指定されたPackを使用する権限がありません')
    }
  }

  // Pack設定をマージ
  const settings = mergePackSettings(pack, opt)

  // 1) Draft→Critique→Revise で"AIくささ"を軽減（Pack設定適用）
  let draft = await critiqueAndRevise(gen, settings.voice, contentPrompt)

  // 2) 見出し自然化（Pack優先、なければ業種別マップ）
  draft = naturalizeHeadings(draft, settings.headingMap)

  // 3) 人肌フィルタ（Pack設定適用）
  draft = ruleFilter(draft)
  
  // Pack固有の人肌ルール適用
  if (settings.humanizeRules.length > 0) {
    let customFiltered = draft
    for (const [pattern, replacement] of settings.humanizeRules) {
      customFiltered = customFiltered.replace(new RegExp(pattern, 'g'), replacement)
    }
    draft = customFiltered
  }

  // LLMによる変な文の言い換え（Pack設定）
  if (settings.useLLMHumanize) {
    const weirds = pickWeirdSentences(draft)
    if (weirds.length) {
      const patched = await gen([
        { role: 'system', content: '次の文だけ自然に言い換えて。意味は変えず、短く。' },
        { role: 'user', content: weirds.map(s => `- ${s}`).join('\n') }
      ])
      const lines = patched.split(/\n/).map(s => s.replace(/^[-・]\s?/, '').trim()).filter(Boolean)
      weirds.forEach((w, i) => { if (lines[i]) draft = draft.replace(w, lines[i]) })
    }
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

  // 6) タイトル自然化 & 先頭H1除去
  let finalTitle = title
  if (opt.naturalizeTitle) {
    finalTitle = naturalizeHeadings(`# ${title}`, settings.headingMap).replace(/^#\s*/, '')
  }
  if (opt.stripLeadingH1) {
    draft = draft.replace(/^\s*#\s*[^\n]+\n+/, '').replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i, '')
  }

  // 7) 構造化データ追加（Pack設定）
  if (settings.enableSchemaOrg) {
    const faqSchema = generateFAQSchema(draft)
    if (faqSchema) {
      draft += '\n\n<script type="application/ld+json">\n' + JSON.stringify(faqSchema, null, 2) + '\n</script>'
    }
  }

  // 8) 投稿
  const res = await postToWordPress(siteId, { title: finalTitle, content: draft })

  // 9) Pack使用統計記録
  if (pack) {
    await recordPackUsage(userId, pack.id, {
      generatedArticles: 1,
      wordsGenerated: draft.length,
      features: [
        'critique-revise',
        'heading-naturalize', 
        'humanize-filter',
        ...(settings.enableSchemaOrg ? ['schema-org'] : [])
      ],
      timestamp: new Date().toISOString()
    })
  }

  return {
    ...res,
    pack: pack ? { id: pack.id, name: pack.name } : null,
    features: {
      critiqueApplied: true,
      headingNaturalized: true,
      humanized: true,
      schemaOrgEnabled: settings.enableSchemaOrg
    }
  }
}

/**
 * FAQ構造化データ生成ヘルパー
 */
function generateFAQSchema(content: string) {
  // 簡易実装：Q&A形式を検出してSchema.org形式に
  const qaPattern = /(?:Q|質問|問題)[:：]?\s*(.+?)\n\s*(?:A|回答|答え)[:：]?\s*(.+?)(?=\n|$)/gi
  const matches = [...content.matchAll(qaPattern)]
  
  if (matches.length === 0) return null

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": matches.map(match => ({
      "@type": "Question",
      "name": match[1].trim(),
      "acceptedAnswer": {
        "@type": "Answer",
        "text": match[2].trim()
      }
    }))
  }
}