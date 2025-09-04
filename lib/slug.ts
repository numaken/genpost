import 'server-only'
import baseSlugify from 'slugify'

/**
 * Generate unique slug with collision prevention
 * - Truncates to 80 chars for DB field limits
 * - Adds optional salt for uniqueness
 * - Handles unicode and special chars safely
 */
export function uniqSlug(title: string, salt = ''): string {
  const s = baseSlugify(title, { 
    lower: true, 
    strict: true,
    trim: true 
  }).slice(0, 80)
  
  return salt ? `${s}-${salt}` : s
}