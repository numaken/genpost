// lib/naturalizeHeadingsByVertical.ts - 業種別見出し自然化

import { headingMapByVertical, type VerticalKey } from './headingMapByVertical'
import { naturalizeHeadings } from './naturalizeHeadings'

/**
 * 業種別見出し自然化
 */
export function naturalizeHeadingsByVertical(
  text: string, 
  vertical: VerticalKey, 
  keywords: string = ''
): string {
  // 共通マップ + 業種別マップを結合
  const map = { 
    ...headingMapByVertical.common, 
    ...(headingMapByVertical[vertical] || {}) 
  }
  
  return naturalizeHeadings(text, map)
}