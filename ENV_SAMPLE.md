# 必須環境変数

セキュリティ強化により、以下の環境変数が必須になりました。
`.env.local`ファイルを作成し、実際の値を設定してください。

```env
# Next.js
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key
EMBEDDING_MODEL=text-embedding-3-small
SIM_THRESHOLD=0.87

# セキュリティ: APIキー暗号化（16文字以上必須）
API_KEY_ENCRYPTION_SECRET=your-32-char-encryption-key-here

# 重複排除設定
REGEN_MAX=5

# Stripe（オプション）
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

## セキュリティ上の注意

1. `API_KEY_ENCRYPTION_SECRET` は16文字以上必須
2. 本番環境では必ず異なる強固な暗号化キーを使用
3. `.env*` ファイルはGitにコミットされません