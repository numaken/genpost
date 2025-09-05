-- GenPost v2: 4W1B+P × 8+1 エンジン
-- Message Contracts + Job Scheduler + WordPress Integration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Message Contracts: 4W1B+P structure with 8+1 configuration
CREATE TABLE IF NOT EXISTS message_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id TEXT NOT NULL,
    contract_version TEXT NOT NULL DEFAULT '1.0.0',
    status TEXT NOT NULL DEFAULT 'active',
    structure TEXT NOT NULL DEFAULT 'PASONA', -- PASONA|SDS
    
    -- 4W1B+P Core Elements
    speaker JSONB NOT NULL,      -- 誰が (role, brand, credibility, voice)
    claim JSONB NOT NULL,        -- 何を (headline, subpoints, uniqueness)
    audience JSONB NOT NULL,     -- 誰に (persona, jobs_to_be_done, objections, knowledge_level)
    benefit JSONB NOT NULL,      -- どんな得 (outcome, emotional, functional, social)
    proof JSONB NOT NULL,        -- 証拠 (evidence_type, sources, metrics, case_studies)
    
    -- 8+1 Configuration
    tone JSONB NOT NULL,         -- formality, energy, expertise, metaphor
    constraints JSONB NOT NULL,  -- max_chars, banned_phrases, required_elements, cta_type
    output JSONB NOT NULL,       -- format, template, style_guide
    magic_hints JSONB NOT NULL DEFAULT '[]'::JSONB, -- +1 magic elements
    
    -- Metadata
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(contract_id, contract_version)
);

-- Schedules: 定期投稿設定
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    site_id UUID NOT NULL,
    contract_id TEXT NOT NULL,
    contract_version TEXT NOT NULL DEFAULT '1.0.0',
    
    -- WordPress Integration
    wp_site_url TEXT NOT NULL,
    category_slug TEXT NOT NULL,
    post_status TEXT NOT NULL DEFAULT 'publish', -- publish|draft
    
    -- Generation Settings  
    post_count INTEGER NOT NULL,
    cron TEXT NOT NULL, -- "0 18 * * *" for daily at 18:00
    tz TEXT NOT NULL DEFAULT 'Asia/Tokyo',
    
    -- Keyword Management
    keyword_pool TEXT[] NOT NULL,
    used_keyword_sets TEXT[][] NOT NULL DEFAULT '{}',
    current_keyword_index INTEGER NOT NULL DEFAULT 0,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active', -- active|paused|completed
    last_generated_at TIMESTAMPTZ,
    next_generation_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (site_id) REFERENCES wordpress_sites(id) ON DELETE CASCADE
);

-- Publish Jobs: 個別投稿ジョブ
CREATE TABLE IF NOT EXISTS publish_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    
    -- Timing
    planned_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    
    -- Status
    state TEXT NOT NULL DEFAULT 'queued', -- queued|running|completed|failed|cancelled
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    
    -- Generation Data
    keywords_used TEXT[],
    article_title TEXT,
    article_content TEXT,
    article_id UUID,
    
    -- WordPress Data
    wp_post_id INTEGER,
    wp_post_url TEXT,
    
    -- Error Handling
    error_message TEXT,
    error_details JSONB,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generation Audit: 生成監査ログ
CREATE TABLE IF NOT EXISTS generation_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- References
    contract_ref TEXT NOT NULL, -- contract_id@version
    job_id UUID, -- NULL for manual generation
    user_id UUID NOT NULL,
    
    -- Generation Details
    prompt_hash TEXT NOT NULL,
    model TEXT NOT NULL, -- gpt-4o-mini, gpt-4o
    keywords_used TEXT[],
    
    -- Quality Metrics
    metrics JSONB NOT NULL, -- coverage, relevance, novelty, readability, cta, proof scores
    verification_score REAL NOT NULL,
    similarity_score REAL, -- against existing content
    
    -- Cost & Performance
    cost_estimate_cents INTEGER NOT NULL,
    generation_time_ms INTEGER,
    retries INTEGER NOT NULL DEFAULT 0,
    
    -- Content Info
    title_generated TEXT,
    char_count INTEGER,
    word_count INTEGER,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generated Articles: 生成済み記事のメタデータ
CREATE TABLE IF NOT EXISTS generated_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
    job_id UUID REFERENCES publish_jobs(id) ON DELETE SET NULL,
    
    -- Content
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    meta_description TEXT,
    
    -- SEO & Structure
    primary_keyword TEXT,
    secondary_keywords TEXT[],
    internal_links TEXT[],
    external_links TEXT[],
    
    -- Similarity Vector for Deduplication
    title_vector REAL[],
    content_vector REAL[],
    
    -- WordPress Integration
    wp_post_id INTEGER,
    wp_category_id INTEGER,
    wp_featured_image_url TEXT,
    
    -- Metadata
    language TEXT NOT NULL DEFAULT 'ja',
    estimated_reading_time INTEGER, -- in minutes
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- WordPress Sites: 連携サイト管理
CREATE TABLE IF NOT EXISTS wordpress_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    site_name TEXT NOT NULL,
    site_url TEXT NOT NULL UNIQUE,
    wp_username TEXT,
    wp_password TEXT,  -- Encrypted
    wp_api_key TEXT,   -- GenPost Bridge plugin API key
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Job Locks: 分散処理でのジョブ重複防止
CREATE TABLE IF NOT EXISTS job_locks (
    lock_key TEXT PRIMARY KEY,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    locked_by TEXT, -- worker instance identifier
    
    INDEX idx_job_locks_expires_at (expires_at)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_message_contracts_status ON message_contracts(status);
CREATE INDEX IF NOT EXISTS idx_message_contracts_created_by ON message_contracts(created_by);

CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status);
CREATE INDEX IF NOT EXISTS idx_schedules_next_generation ON schedules(next_generation_at) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_publish_jobs_schedule_id ON publish_jobs(schedule_id);
CREATE INDEX IF NOT EXISTS idx_publish_jobs_state ON publish_jobs(state);
CREATE INDEX IF NOT EXISTS idx_publish_jobs_planned_at ON publish_jobs(planned_at);
CREATE INDEX IF NOT EXISTS idx_publish_jobs_state_planned ON publish_jobs(state, planned_at) WHERE state IN ('queued', 'failed');

CREATE INDEX IF NOT EXISTS idx_generation_audit_contract_ref ON generation_audit(contract_ref);
CREATE INDEX IF NOT EXISTS idx_generation_audit_user_id ON generation_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_audit_created_at ON generation_audit(created_at);

CREATE INDEX IF NOT EXISTS idx_generated_articles_user_id ON generated_articles(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_articles_primary_keyword ON generated_articles(primary_keyword);

CREATE INDEX IF NOT EXISTS idx_wordpress_sites_user_id ON wordpress_sites(user_id);
CREATE INDEX IF NOT EXISTS idx_wordpress_sites_status ON wordpress_sites(status);
CREATE INDEX IF NOT EXISTS idx_generated_articles_wp_post_id ON generated_articles(wp_post_id);

-- Row Level Security
ALTER TABLE message_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE publish_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_articles ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Initially disabled for setup, enable after testing)
-- Users can only access their own data

-- CREATE POLICY "Users can view their own contracts" ON message_contracts
--     FOR SELECT USING (created_by = auth.uid());

-- CREATE POLICY "Users can create contracts" ON message_contracts  
--     FOR INSERT WITH CHECK (created_by = auth.uid());

-- CREATE POLICY "Users can view their own schedules" ON schedules
--     FOR SELECT USING (user_id = auth.uid());

-- CREATE POLICY "Users can manage their own schedules" ON schedules
--     FOR ALL USING (user_id = auth.uid());

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_message_contracts_updated_at 
    BEFORE UPDATE ON message_contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at
    BEFORE UPDATE ON schedules  
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_publish_jobs_updated_at
    BEFORE UPDATE ON publish_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper function for keyword combination generation
CREATE OR REPLACE FUNCTION generate_keyword_combinations(
    keywords TEXT[],
    combination_size INTEGER DEFAULT 3
) RETURNS TEXT[][]
LANGUAGE plpgsql
AS $$
DECLARE
    combinations TEXT[][];
    i INTEGER;
    j INTEGER; 
    k INTEGER;
    combo TEXT[];
BEGIN
    -- Simple 3-keyword combinations
    combinations := '{}';
    
    FOR i IN 1..array_length(keywords, 1) - 2 LOOP
        FOR j IN i+1..array_length(keywords, 1) - 1 LOOP
            FOR k IN j+1..array_length(keywords, 1) LOOP
                combo := ARRAY[keywords[i], keywords[j], keywords[k]];
                combinations := array_append(combinations, combo);
            END LOOP;
        END LOOP;
    END LOOP;
    
    RETURN combinations;
END;
$$;

-- Function to get next keyword set for a schedule
CREATE OR REPLACE FUNCTION get_next_keywords(schedule_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
AS $$
DECLARE
    schedule_record RECORD;
    all_combinations TEXT[][];
    next_combo TEXT[];
BEGIN
    SELECT keyword_pool, used_keyword_sets, current_keyword_index
    INTO schedule_record 
    FROM schedules 
    WHERE id = schedule_id;
    
    -- Generate all possible combinations
    all_combinations := generate_keyword_combinations(schedule_record.keyword_pool);
    
    -- Filter out used combinations
    -- Return next unused combination
    FOR i IN 1..array_length(all_combinations, 1) LOOP
        next_combo := all_combinations[i];
        
        -- Check if this combination has been used
        IF NOT (next_combo = ANY(schedule_record.used_keyword_sets)) THEN
            RETURN next_combo;
        END IF;
    END LOOP;
    
    -- If all combinations used, return a random one (with seasonal variation)
    RETURN all_combinations[1 + (EXTRACT(DOY FROM NOW())::INTEGER % array_length(all_combinations, 1))];
END;
$$;