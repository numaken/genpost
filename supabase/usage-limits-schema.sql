-- User usage tracking and limits
CREATE TABLE IF NOT EXISTS user_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    month VARCHAR(7) NOT NULL, -- YYYY-MM format
    total_articles INTEGER DEFAULT 0,
    shared_api_articles INTEGER DEFAULT 0, -- 共有APIキーでの生成数
    user_api_articles INTEGER DEFAULT 0,   -- ユーザーAPIキーでの生成数
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, month)
);

-- User subscription plans
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    plan_type VARCHAR(50) DEFAULT 'free', -- free, basic, pro, unlimited
    max_shared_api_articles INTEGER DEFAULT 5, -- 共有APIでの月間制限
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ends_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    stripe_subscription_id VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for user_usage
CREATE POLICY "Users can view their own usage" ON user_usage
    FOR SELECT USING (auth.email() = user_id);

CREATE POLICY "Users can insert their own usage" ON user_usage
    FOR INSERT WITH CHECK (auth.email() = user_id);

CREATE POLICY "Users can update their own usage" ON user_usage
    FOR UPDATE USING (auth.email() = user_id) WITH CHECK (auth.email() = user_id);

-- Policies for user_subscriptions
CREATE POLICY "Users can view their own subscription" ON user_subscriptions
    FOR SELECT USING (auth.email() = user_id);

CREATE POLICY "Users can insert their own subscription" ON user_subscriptions
    FOR INSERT WITH CHECK (auth.email() = user_id);

CREATE POLICY "Users can update their own subscription" ON user_subscriptions
    FOR UPDATE USING (auth.email() = user_id) WITH CHECK (auth.email() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_usage_user_month ON user_usage(user_id, month);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active ON user_subscriptions(is_active);

-- Function to get current month usage
CREATE OR REPLACE FUNCTION get_user_current_month_usage(p_user_id VARCHAR)
RETURNS TABLE(
    shared_api_count INTEGER,
    user_api_count INTEGER,
    total_count INTEGER,
    current_month VARCHAR
) AS $$
DECLARE
    current_month_str VARCHAR := TO_CHAR(NOW(), 'YYYY-MM');
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(u.shared_api_articles, 0)::INTEGER,
        COALESCE(u.user_api_articles, 0)::INTEGER,
        COALESCE(u.total_articles, 0)::INTEGER,
        current_month_str
    FROM user_usage u
    WHERE u.user_id = p_user_id AND u.month = current_month_str
    
    UNION ALL
    
    SELECT 0::INTEGER, 0::INTEGER, 0::INTEGER, current_month_str
    WHERE NOT EXISTS (
        SELECT 1 FROM user_usage u
        WHERE u.user_id = p_user_id AND u.month = current_month_str
    )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_user_usage(
    p_user_id VARCHAR,
    p_is_shared_api BOOLEAN DEFAULT true
) RETURNS VOID AS $$
DECLARE
    current_month_str VARCHAR := TO_CHAR(NOW(), 'YYYY-MM');
BEGIN
    INSERT INTO user_usage (user_id, month, total_articles, shared_api_articles, user_api_articles)
    VALUES (
        p_user_id,
        current_month_str,
        1,
        CASE WHEN p_is_shared_api THEN 1 ELSE 0 END,
        CASE WHEN p_is_shared_api THEN 0 ELSE 1 END
    )
    ON CONFLICT (user_id, month)
    DO UPDATE SET
        total_articles = user_usage.total_articles + 1,
        shared_api_articles = CASE 
            WHEN p_is_shared_api THEN user_usage.shared_api_articles + 1
            ELSE user_usage.shared_api_articles
        END,
        user_api_articles = CASE 
            WHEN NOT p_is_shared_api THEN user_usage.user_api_articles + 1
            ELSE user_usage.user_api_articles
        END,
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated at trigger for user_subscriptions
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();