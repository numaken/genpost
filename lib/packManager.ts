// lib/packManager.ts - Pack version management
import fs from 'fs'
import path from 'path'

export interface PackConfig {
  name: string
  version: string
  description: string
  target: string
  heading?: {
    map: Record<string, string>
  }
  humanize?: {
    rules: Array<{
      pattern: string
      replacement: string
    }>
  }
  flow?: {
    critiqueRubric: string
  }
  industry_context?: {
    keywords: string[]
    tone: string
  }
  examples?: {
    before: string
    after: string
  }
}

export type PackVersion = 'v1' | 'v1.1'
export type PackType = 'restaurant' | 'beauty' | 'saas' | 'general'

/**
 * 利用可能なPackを取得
 */
export function getAvailablePacks(): { type: PackType; versions: PackVersion[] }[] {
  return [
    { type: 'general', versions: ['v1'] },
    { type: 'restaurant', versions: ['v1', 'v1.1'] },
    { type: 'beauty', versions: ['v1', 'v1.1'] },
    { type: 'saas', versions: ['v1', 'v1.1'] }
  ]
}

/**
 * Pack設定を読み込み
 */
export async function loadPackConfig(packType: PackType, version: PackVersion = 'v1'): Promise<PackConfig | null> {
  try {
    const packsDir = path.join(process.cwd(), 'packs')
    
    // v1.1が指定された場合は専用ファイルを探す
    let filename: string
    if (version === 'v1.1') {
      filename = `${packType}.v1_1.json`
    } else {
      filename = `${packType}.json` // 従来のv1ファイル
    }
    
    const filePath = path.join(packsDir, filename)
    
    // ファイルが存在するかチェック
    if (!fs.existsSync(filePath)) {
      console.warn(`Pack file not found: ${filePath}`)
      return null
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const config = JSON.parse(fileContent) as PackConfig
    
    return config
  } catch (error) {
    console.error(`Failed to load pack config: ${packType} ${version}`, error)
    return null
  }
}

/**
 * Pack設定を記事生成に適用
 */
export function applyPackConfig(
  baseHeading: string, 
  baseContent: string, 
  config: PackConfig
): { heading: string; content: string } {
  let processedHeading = baseHeading
  let processedContent = baseContent
  
  // 見出し変換適用
  if (config.heading?.map) {
    for (const [from, to] of Object.entries(config.heading.map)) {
      const regex = new RegExp(from, 'g')
      processedHeading = processedHeading.replace(regex, to)
      processedContent = processedContent.replace(regex, to)
    }
  }
  
  // 人肌フィルタルール適用
  if (config.humanize?.rules) {
    for (const rule of config.humanize.rules) {
      const regex = new RegExp(rule.pattern, 'g')
      processedHeading = processedHeading.replace(regex, rule.replacement)
      processedContent = processedContent.replace(regex, rule.replacement)
    }
  }
  
  return {
    heading: processedHeading,
    content: processedContent
  }
}

/**
 * Pack適用済み批評ルーブリック取得
 */
export function getPackCritiqueRubric(config: PackConfig): string {
  const baseRubric = '紋切り/冗長/曖昧の改善案を出す'
  
  if (config.flow?.critiqueRubric) {
    return config.flow.critiqueRubric
  }
  
  return baseRubric
}

/**
 * 開発用：Pack設定デバッグ表示
 */
export function debugPackConfig(config: PackConfig): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('🎒 Pack Config Applied:', {
      name: config.name,
      version: config.version,
      headingRules: Object.keys(config.heading?.map || {}),
      humanizeRules: config.humanize?.rules?.length || 0,
      critiqueCustom: !!config.flow?.critiqueRubric
    })
  }
}