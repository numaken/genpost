// Build-time validation for required environment variables
const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_SECRET
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 16) {
  throw new Error('API_KEY_ENCRYPTION_SECRET is required and must be >=16 chars for build')
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['openai']
  },
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  }
}

module.exports = nextConfig