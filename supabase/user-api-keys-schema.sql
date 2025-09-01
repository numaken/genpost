-- User API keys table for storing encrypted API keys
CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    service VARCHAR(50) NOT NULL DEFAULT 'openai',
    encrypted_api_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, service)
);

-- Row Level Security
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Policies (users can only access their own API keys)
CREATE POLICY "Users can view their own API keys" ON user_api_keys
    FOR SELECT USING (auth.email() = user_id);

CREATE POLICY "Users can insert their own API keys" ON user_api_keys
    FOR INSERT WITH CHECK (auth.email() = user_id);

CREATE POLICY "Users can update their own API keys" ON user_api_keys
    FOR UPDATE USING (auth.email() = user_id) WITH CHECK (auth.email() = user_id);

CREATE POLICY "Users can delete their own API keys" ON user_api_keys
    FOR DELETE USING (auth.email() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_service ON user_api_keys(service);

-- Updated at trigger
CREATE TRIGGER update_user_api_keys_updated_at BEFORE UPDATE ON user_api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();