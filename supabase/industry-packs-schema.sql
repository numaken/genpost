-- Industry packs table for bulk purchases
CREATE TABLE IF NOT EXISTS industry_packs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    pack_id VARCHAR(100) UNIQUE NOT NULL,
    industry VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    icon VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User industry pack purchases
CREATE TABLE IF NOT EXISTS user_industry_packs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    pack_id VARCHAR(100) NOT NULL REFERENCES industry_packs(pack_id),
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    stripe_session_id VARCHAR(500),
    UNIQUE(user_id, pack_id)
);

-- Row Level Security
ALTER TABLE industry_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_industry_packs ENABLE ROW LEVEL SECURITY;

-- Policies for industry_packs (readable by all, writable by service role only)
CREATE POLICY "Industry packs are viewable by everyone" ON industry_packs
    FOR SELECT USING (is_active = true);

-- Policies for user_industry_packs (users can only see their own purchases)
CREATE POLICY "Users can view their own industry pack purchases" ON user_industry_packs
    FOR SELECT USING (auth.email() = user_id);

CREATE POLICY "Users can insert their own industry pack purchases" ON user_industry_packs
    FOR INSERT WITH CHECK (auth.email() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_industry_packs_industry ON industry_packs(industry);
CREATE INDEX IF NOT EXISTS idx_industry_packs_active ON industry_packs(is_active);
CREATE INDEX IF NOT EXISTS idx_user_industry_packs_user_id ON user_industry_packs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_industry_packs_pack_id ON user_industry_packs(pack_id);

-- Updated at trigger for industry_packs
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_industry_packs_updated_at BEFORE UPDATE ON industry_packs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();