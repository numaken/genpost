-- 新しいプラン構成に対応したスキーマ更新

-- user_subscriptions テーブルに新フィールド追加
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_sites INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS seats INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS soft_cap BOOLEAN DEFAULT false;

-- user_usage テーブルにデイリーカウント追加
ALTER TABLE user_usage 
ADD COLUMN IF NOT EXISTS daily_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_date DATE DEFAULT CURRENT_DATE;

-- デイリー使用量リセット関数
CREATE OR REPLACE FUNCTION reset_daily_usage()
RETURNS void AS $$
BEGIN
  UPDATE user_usage 
  SET daily_count = 0, current_date = CURRENT_DATE 
  WHERE current_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- デイリー使用量を含む使用量取得関数を更新
CREATE OR REPLACE FUNCTION get_user_current_month_usage(p_user_id TEXT)
RETURNS TABLE (
  shared_api_count INTEGER,
  user_api_count INTEGER, 
  total_count INTEGER,
  current_month TEXT,
  daily_count INTEGER,
  current_date TEXT
) AS $$
BEGIN
  -- デイリー使用量リセット
  PERFORM reset_daily_usage();
  
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN is_shared_api = true THEN 1 ELSE 0 END), 0)::INTEGER as shared_api_count,
    COALESCE(SUM(CASE WHEN is_shared_api = false THEN 1 ELSE 0 END), 0)::INTEGER as user_api_count,
    COALESCE(COUNT(*), 0)::INTEGER as total_count,
    TO_CHAR(DATE_TRUNC('month', CURRENT_DATE), 'YYYY-MM') as current_month,
    COALESCE((SELECT daily_count FROM user_usage WHERE user_id = p_user_id AND current_date = CURRENT_DATE LIMIT 1), 0)::INTEGER as daily_count,
    CURRENT_DATE::TEXT as current_date
  FROM user_usage 
  WHERE user_id = p_user_id 
    AND DATE_TRUNC('month', used_at) = DATE_TRUNC('month', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- 使用量増加関数を更新（デイリーカウント対応）
CREATE OR REPLACE FUNCTION increment_user_usage(p_user_id TEXT, p_is_shared_api BOOLEAN DEFAULT true)
RETURNS void AS $$
BEGIN
  -- 月間使用量記録
  INSERT INTO user_usage (user_id, is_shared_api, used_at)
  VALUES (p_user_id, p_is_shared_api, NOW());
  
  -- デイリー使用量更新
  INSERT INTO user_usage (user_id, daily_count, current_date)
  VALUES (p_user_id, 1, CURRENT_DATE)
  ON CONFLICT (user_id, current_date)
  DO UPDATE SET daily_count = user_usage.daily_count + 1;
END;
$$ LANGUAGE plpgsql;

-- 新プラン定義の更新
UPDATE user_subscriptions 
SET 
  daily_limit = CASE plan_type
    WHEN 'free' THEN 1
    WHEN 'starter' THEN 1  
    WHEN 'pro' THEN 5
    WHEN 'agency' THEN 20
    ELSE 1
  END,
  max_sites = CASE plan_type
    WHEN 'free' THEN 1
    WHEN 'starter' THEN 2
    WHEN 'pro' THEN 5  
    WHEN 'agency' THEN 20
    ELSE 1
  END,
  seats = CASE plan_type
    WHEN 'agency' THEN 5
    ELSE 1
  END,
  soft_cap = CASE plan_type
    WHEN 'starter' THEN true
    WHEN 'pro' THEN true
    WHEN 'agency' THEN true
    ELSE false
  END,
  max_shared_api_articles = CASE plan_type
    WHEN 'free' THEN 5
    WHEN 'starter' THEN 30
    WHEN 'pro' THEN 120
    WHEN 'agency' THEN 500
    ELSE 5
  END
WHERE plan_type IN ('free', 'starter', 'pro', 'agency');