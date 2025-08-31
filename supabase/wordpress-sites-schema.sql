-- WordPress サイト管理テーブル
CREATE TABLE wordpress_sites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_email TEXT NOT NULL,
  site_name TEXT NOT NULL, -- ユーザーが設定するサイト名
  site_url TEXT NOT NULL,
  wp_username TEXT NOT NULL,
  wp_app_password TEXT NOT NULL, -- 暗号化して保存
  default_category_id INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ユーザーのサイト数制限管理テーブル
CREATE TABLE user_site_limits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_email TEXT UNIQUE NOT NULL,
  max_sites INTEGER DEFAULT 2, -- デフォルト2サイトまで
  is_unlimited BOOLEAN DEFAULT false, -- 無制限プラン
  unlimited_expires_at TIMESTAMP WITH TIME ZONE, -- 無制限プランの期限
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 無制限サイトプラン購入履歴
CREATE TABLE unlimited_site_purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_email TEXT NOT NULL,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL, -- 金額（円）
  duration_months INTEGER DEFAULT 12, -- 期間（月）
  status TEXT DEFAULT 'pending', -- pending, completed, failed
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_wordpress_sites_user_email ON wordpress_sites(user_email);
CREATE INDEX idx_wordpress_sites_active ON wordpress_sites(user_email, is_active);
CREATE INDEX idx_user_site_limits_email ON user_site_limits(user_email);

-- RLS（Row Level Security）設定
ALTER TABLE wordpress_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_site_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE unlimited_site_purchases ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（ユーザーは自分のデータのみアクセス可能）
CREATE POLICY "Users can view own sites" ON wordpress_sites
    FOR SELECT USING (user_email = current_setting('request.jwt.claims')::json->>'email');

CREATE POLICY "Users can insert own sites" ON wordpress_sites
    FOR INSERT WITH CHECK (user_email = current_setting('request.jwt.claims')::json->>'email');

CREATE POLICY "Users can update own sites" ON wordpress_sites
    FOR UPDATE USING (user_email = current_setting('request.jwt.claims')::json->>'email');

CREATE POLICY "Users can delete own sites" ON wordpress_sites
    FOR DELETE USING (user_email = current_setting('request.jwt.claims')::json->>'email');

-- user_site_limits のRLSポリシー
CREATE POLICY "Users can view own limits" ON user_site_limits
    FOR SELECT USING (user_email = current_setting('request.jwt.claims')::json->>'email');

CREATE POLICY "Users can update own limits" ON user_site_limits
    FOR UPDATE USING (user_email = current_setting('request.jwt.claims')::json->>'email');

-- unlimited_site_purchases のRLSポリシー  
CREATE POLICY "Users can view own purchases" ON unlimited_site_purchases
    FOR SELECT USING (user_email = current_setting('request.jwt.claims')::json->>'email');

-- 初期データ挿入用関数
CREATE OR REPLACE FUNCTION ensure_user_site_limit(email_param TEXT)
RETURNS user_site_limits AS $$
DECLARE
    result user_site_limits;
BEGIN
    SELECT * INTO result FROM user_site_limits WHERE user_email = email_param;
    
    IF NOT FOUND THEN
        INSERT INTO user_site_limits (user_email, max_sites)
        VALUES (email_param, 2)
        RETURNING * INTO result;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;