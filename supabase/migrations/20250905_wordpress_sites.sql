-- WordPress sites table with RLS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS wordpress_sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  site_name TEXT NOT NULL,
  site_url TEXT NOT NULL UNIQUE,
  category_slug TEXT,
  wp_api_key TEXT,           -- GenPost Bridge 用（JWTやApp PWでも可）
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','error')),
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS（所有者のみ可）
ALTER TABLE wordpress_sites ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "wp_sites_select_own" ON wordpress_sites
    FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "wp_sites_upsert_own" ON wordpress_sites
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "wp_sites_update_own" ON wordpress_sites
    FOR UPDATE USING (auth.uid() = user_id);
  CREATE POLICY "wp_sites_delete_own" ON wordpress_sites
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_wordpress_sites_user ON wordpress_sites(user_id);