-- Message Contract (4W1B+P) schema for GenPost
-- Replaces the ineffective prompts system

CREATE TABLE IF NOT EXISTS message_contracts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contract_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    
    -- 4W1B+P Structure
    speaker JSONB NOT NULL,           -- 誰（発信者）
    claim JSONB NOT NULL,             -- 何を（主張/価値提案）
    audience JSONB NOT NULL,          -- 誰に（ターゲット）
    benefit JSONB NOT NULL,           -- どんな得（ベネフィット）
    proof JSONB NOT NULL,             -- 証拠（根拠）
    
    -- Generation constraints
    constraints JSONB NOT NULL,       -- 制約条件
    
    -- Business data
    price INTEGER NOT NULL DEFAULT 0,
    is_free BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User purchases of message contracts
CREATE TABLE IF NOT EXISTS user_message_contracts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    contract_id VARCHAR(100) NOT NULL REFERENCES message_contracts(contract_id),
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    stripe_session_id VARCHAR(500),
    UNIQUE(user_id, contract_id)
);

-- Row Level Security
ALTER TABLE message_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_message_contracts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Contracts are viewable by everyone" ON message_contracts
    FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view their own contract purchases" ON user_message_contracts
    FOR SELECT USING (auth.email() = user_id);

CREATE POLICY "Users can insert their own contract purchases" ON user_message_contracts
    FOR INSERT WITH CHECK (auth.email() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_message_contracts_active ON message_contracts(is_active);
CREATE INDEX IF NOT EXISTS idx_user_message_contracts_user_id ON user_message_contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_message_contracts_contract_id ON user_message_contracts(contract_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_message_contracts_updated_at 
    BEFORE UPDATE ON message_contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();