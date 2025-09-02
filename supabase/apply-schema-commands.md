# Supabaseスキーマ適用手順

## 1. Supabaseダッシュボードアクセス
1. https://app.supabase.com/ にアクセス
2. プロジェクト「GenPost」を選択
3. 左メニューから「SQL Editor」をクリック

## 2. スキーマSQL実行

### ⚠️ 重要事項
- 実行前にデータベースのバックアップを推奨
- 本番環境では慎重に実行

### 実行するSQL（コピー&ペースト用）

```sql
-- プロンプトバージョン管理テーブル
CREATE TABLE IF NOT EXISTS prompt_versions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    prompt_id VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL DEFAULT 'v1.0',
    version_name VARCHAR(100) NOT NULL,
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT NOT NULL,
    gen_config JSONB,
    quality_settings JSONB,
    is_active BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(prompt_id, version)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_id ON prompt_versions(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_active ON prompt_versions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_prompt_versions_default ON prompt_versions(is_default) WHERE is_default = true;

-- RLS設定
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view prompt versions" ON prompt_versions FOR SELECT USING (true);

-- A/Bテスト結果記録テーブル
CREATE TABLE IF NOT EXISTS prompt_ab_test_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    prompt_id VARCHAR(255) NOT NULL,
    version_used VARCHAR(50) NOT NULL,
    article_generated TEXT,
    generation_time_ms INTEGER,
    quality_score DECIMAL(3,2),
    user_satisfaction INTEGER,
    metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/Bテスト結果のインデックス
CREATE INDEX IF NOT EXISTS idx_ab_test_prompt_version ON prompt_ab_test_results(prompt_id, version_used);
CREATE INDEX IF NOT EXISTS idx_ab_test_user ON prompt_ab_test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_created ON prompt_ab_test_results(created_at);

-- RLS設定
ALTER TABLE prompt_ab_test_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own test results" ON prompt_ab_test_results FOR SELECT USING (auth.email() = user_id);

-- A/Bテスト設定テーブル
CREATE TABLE IF NOT EXISTS prompt_ab_test_config (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    prompt_id VARCHAR(255) NOT NULL UNIQUE,
    test_name VARCHAR(100) NOT NULL,
    version_a VARCHAR(50) NOT NULL,
    version_b VARCHAR(50) NOT NULL,
    traffic_split DECIMAL(3,2) DEFAULT 0.50,
    is_active BOOLEAN DEFAULT false,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    target_sample_size INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/Bテスト設定のインデックス
CREATE INDEX IF NOT EXISTS idx_ab_config_active ON prompt_ab_test_config(is_active) WHERE is_active = true;

-- 品質評価関数
CREATE OR REPLACE FUNCTION calculate_article_quality_score(
    article_text TEXT,
    target_settings JSONB
) RETURNS DECIMAL(3,2) AS $$
DECLARE
    score DECIMAL(3,2) := 0.00;
    char_count INTEGER;
    has_title BOOLEAN;
    has_structure BOOLEAN;
    data_points INTEGER;
BEGIN
    char_count := LENGTH(article_text);
    has_title := article_text ~ '【タイトル】';
    has_structure := article_text ~ '##';
    data_points := array_length(regexp_split_to_array(article_text, '\d+[年月日%万円]'), 1) - 1;
    
    IF char_count >= (target_settings->>'target_char_count')::INTEGER * 0.8 THEN
        score := score + 0.25;
    END IF;
    
    IF has_title AND (target_settings->>'has_title_tag')::BOOLEAN THEN
        score := score + 0.25;
    END IF;
    
    IF has_structure AND (target_settings->>'has_structured_content')::BOOLEAN THEN
        score := score + 0.25;
    END IF;
    
    IF data_points >= (target_settings->>'required_data_points')::INTEGER THEN
        score := score + 0.25;
    END IF;
    
    RETURN LEAST(score, 1.00);
END;
$$ LANGUAGE plpgsql;
```

## 3. テスト用データ挿入

スキーマ作成後、以下のテストデータを挿入：

```sql
-- 改良版プロンプト（不動産業界）を挿入
INSERT INTO prompt_versions (
    prompt_id, 
    version, 
    version_name, 
    system_prompt, 
    user_prompt_template, 
    gen_config,
    quality_settings,
    is_active
) VALUES (
    'real-estate-customer-acquisition-how-to',
    'v2.0',
    '改良版（品質強化）',
    'あなたは不動産業界で15年の実務経験を持つ専門ライター兼宅地建物取引士です。

# 執筆方針
- 専門知識: 建築基準法、宅建業法、地域相場動向に精通
- 読者目線: 初心者にも分かりやすく、具体的で実践的
- 信頼構築: データや事例を用いた説得力のある内容
- 行動促進: 自然な流れでサービス利用を促す

# 出力形式
【タイトル】SEO最適化された魅力的な見出し
【記事内容】
## 導入（問題提起・共感）
## 本文（3-4つのポイントで構成）
## 結論（まとめ・次のアクション）

# 品質基準
- 読みやすさ: 1文40文字以内、段落は3-4行以内
- 信頼性: 具体的な数値・事例を最低2つ含める  
- 実用性: 読者が即実践できる具体的手順を提示
- SEO: 自然なキーワード配置（詰め込み禁止）

メタ表現は厳禁。読者に直接語りかける文体で執筆してください。',
    
    '【記事作成設定】
対象サービス: {service}
ターゲット: {target_audience}
解決課題: {challenge}
強み・特徴: {unique_value}
地域情報: {location}（※未入力の場合は一般的な内容で作成）

上記設定で、読者が「このサービスを利用したい」と思える説得力のある記事を作成してください。',
    
    '{"temperature":0.5,"max_tokens":2200,"model":"gpt-3.5-turbo","top_p":0.9,"presence_penalty":0.15,"frequency_penalty":0.15}',
    
    '{"target_char_count":2000,"max_sentence_length":40,"required_data_points":2,"seo_optimized":true,"structured_output":true,"industry_specific":true,"has_title_tag":true,"has_structured_content":true}',
    
    true
);

-- A/Bテスト設定を挿入
INSERT INTO prompt_ab_test_config (
    prompt_id,
    test_name,
    version_a,
    version_b,
    traffic_split,
    target_sample_size
) VALUES (
    'real-estate-customer-acquisition-how-to',
    '不動産ハウツー記事品質改善テスト',
    'v1.0',
    'v2.0',
    0.30,
    50
);
```

## 4. 実行確認

実行後、以下のクエリで確認：

```sql
-- テーブル作成確認
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%prompt%';

-- データ挿入確認
SELECT * FROM prompt_versions;
SELECT * FROM prompt_ab_test_config;
```

## 5. エラーが発生した場合

- エラーメッセージを確認
- 既存テーブルとの競合がないか確認
- 権限エラーの場合は管理者権限で実行