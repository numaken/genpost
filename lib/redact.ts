/**
 * Redact sensitive information from logs
 * - Masks API keys (sk-xxx...)
 * - Masks service role keys
 * - Prevents accidental secret exposure in error messages
 */
export const redact = (s: string = ''): string =>
  s.replace(/sk-[A-Za-z0-9]{10,}/g, 'sk-***')
   .replace(/(service_role(?:\w|=|%3D){0,16})[A-Za-z0-9._-]+/gi, '$1***')
   .replace(/(supabase[^"]{0,8}key=)[^"&]+/gi, '$1***')
   .replace(/Bearer\s+[A-Za-z0-9._-]{20,}/gi, 'Bearer ***')