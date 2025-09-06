-- sql/pack_system_schema.sql - Pack販売システムのDBスキーマ

-- =====================================
-- Pack商品マスタ
-- =====================================
CREATE TABLE packs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('voice', 'heading', 'humanize', 'flow', 'rag', 'complete')),
  vertical TEXT, -- restaurant, retail, healthcare, etc.
  version INTEGER NOT NULL DEFAULT 1,
  price INTEGER NOT NULL DEFAULT 0, -- 円単位
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  assets JSONB NOT NULL DEFAULT '{}', -- Pack設定（voice, heading, humanize, flow, rag, meta）
  
  -- メタデータ
  tags TEXT[], -- 検索用タグ
  author_id UUID, -- 作成者
  featured_image TEXT, -- アイキャッチ画像URL
  demo_content TEXT, -- デモ用生成サンプル
  
  -- 統計
  download_count INTEGER DEFAULT 0,
  rating_avg DECIMAL(3,2) DEFAULT 0, -- 1.00-5.00
  rating_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_packs_type ON packs (type);
CREATE INDEX idx_packs_vertical ON packs (vertical);
CREATE INDEX idx_packs_active ON packs (is_active);
CREATE INDEX idx_packs_price ON packs (price);

-- =====================================
-- Pack購入権（エンタイトルメント）
-- =====================================
CREATE TABLE pack_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pack_id TEXT NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  
  -- プラン情報
  plan TEXT NOT NULL DEFAULT 'basic' CHECK (plan IN ('trial', 'basic', 'pro', 'enterprise')),
  payment_method TEXT, -- 'stripe', 'paypal', 'manual', etc.
  payment_id TEXT, -- Stripe payment intent ID等
  
  -- 期間
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ, -- NULLは買い切り
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- メタデータ  
  purchased_price INTEGER, -- 購入時の価格
  discount_code TEXT, -- 使用したクーポンコード
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 複合ユニーク制約
  UNIQUE(user_id, pack_id)
);

-- インデックス
CREATE INDEX idx_pack_entitlements_user_id ON pack_entitlements (user_id);
CREATE INDEX idx_pack_entitlements_pack_id ON pack_entitlements (pack_id);
CREATE INDEX idx_pack_entitlements_active ON pack_entitlements (is_active);
CREATE INDEX idx_pack_entitlements_ends_at ON pack_entitlements (ends_at);

-- =====================================
-- Pack使用統計
-- =====================================
CREATE TABLE pack_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pack_id TEXT NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  
  -- 使用実績
  generated_articles INTEGER NOT NULL DEFAULT 0,
  words_generated INTEGER NOT NULL DEFAULT 0,
  features_used TEXT[] NOT NULL DEFAULT '{}', -- ['critique-revise', 'schema-org']
  
  -- 成果指標（後で追加可能）
  click_through_rate DECIMAL(5,4), -- CTR
  conversion_rate DECIMAL(5,4), -- CVR
  engagement_score INTEGER, -- エンゲージメントスコア
  
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 外部キー制約
  FOREIGN KEY (user_id, pack_id) REFERENCES pack_entitlements(user_id, pack_id)
);

-- インデックス
CREATE INDEX idx_pack_usage_stats_user_id ON pack_usage_stats (user_id);
CREATE INDEX idx_pack_usage_stats_pack_id ON pack_usage_stats (pack_id);
CREATE INDEX idx_pack_usage_stats_used_at ON pack_usage_stats (used_at);

-- =====================================
-- Pack評価・レビュー
-- =====================================
CREATE TABLE pack_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id TEXT NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(pack_id, user_id)
);

-- インデックス
CREATE INDEX idx_pack_reviews_pack_id ON pack_reviews (pack_id);
CREATE INDEX idx_pack_reviews_rating ON pack_reviews (rating);

-- =====================================
-- Pack依存関係（Pack同士の組み合わせ）
-- =====================================
CREATE TABLE pack_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id TEXT NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  depends_on_pack_id TEXT NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'requires' CHECK (dependency_type IN ('requires', 'recommends', 'conflicts')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(pack_id, depends_on_pack_id)
);

-- =====================================
-- 旧プロンプトDB移行用テーブル
-- =====================================
CREATE TABLE prompt_migration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_prompt_id TEXT NOT NULL,
  new_pack_id TEXT NOT NULL REFERENCES packs(id),
  migration_type TEXT NOT NULL, -- 'full', 'voice_only', 'heading_only', etc.
  migration_notes TEXT,
  migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(old_prompt_id)
);

-- =====================================
-- サンプルデータ（開発用）
-- =====================================

-- 飲食店向けPackサンプル
INSERT INTO packs (id, name, description, type, vertical, price, assets) VALUES 
('restaurant-growth-pack-v1', '飲食店 来店促進パック v1', 'レストラン・カフェ向けの来店促進に特化したPackです。友達口調で親しみやすく、具体的な数字と実例で説得力を高めます。', 'complete', 'restaurant', 4980, '{
  "voice": {
    "system": "あなたは飲食店オーナーの友人として、来店促進のアドバイスをする親しみやすいライターです。読者に寄り添い、実体験を交えながら具体的で実践しやすい提案をしてください。",
    "temperature": 0.6,
    "maxTokens": 4000
  },
  "heading": {
    "map": {
      "読者の抱える課題": "こんな悩み、ありませんか？",
      "解決策と提案": "来店を増やす3つの打ち手", 
      "根拠と証拠": "数字で見る手応え",
      "メリット・効果": "お客様の反応が変わった理由",
      "行動喚起": "まずはここから"
    }
  },
  "humanize": {
    "rules": [
      ["本記事では", "今日は"],
      ["ご紹介します", "紹介しよう"],
      ["重要です", "大事なポイント"]
    ],
    "useLLM": true
  },
  "flow": {
    "critiqueRubric": "飲食店向けとして、1)実用性の低い提案 2)数字・根拠不足 3)来店につながらない内容を指摘",
    "skipThreshold": 2
  },
  "meta": {
    "schemaOrg": true,
    "seoBoost": true
  }
}');

-- 美容・エステ向けPackサンプル  
INSERT INTO packs (id, name, description, type, vertical, price, assets) VALUES
('beauty-conversion-pack-v1', '美容・エステ CVアップパック v1', '美容業界向けの予約・来店促進に特化。女性読者の心理に寄り添った文体で、Before/After事例と安心感を重視した構成です。', 'complete', 'beauty', 6980, '{
  "voice": {
    "system": "あなたは美容のプロフェッショナルとして、女性読者の美容への悩みに共感し、専門知識と実例をもとに安心して行動できる提案をする温かみのあるライターです。",
    "temperature": 0.5
  },
  "heading": {
    "map": {
      "解決策と提案": "美しくなるための3ステップ",
      "根拠と証拠": "お客様のBefore→After", 
      "行動喚起": "今すぐ始める美容ケア"
    }
  },
  "humanize": {
    "rules": [
      ["効果的です", "実際に変化を感じられます"],
      ["おすすめします", "ぜひ試してみてください"]
    ]
  },
  "meta": {
    "schemaOrg": true
  }
}');

-- 無料トライアルPack
INSERT INTO packs (id, name, description, type, vertical, price, assets) VALUES
('free-trial-pack-v1', '無料トライアルパック', '初回限定の無料お試しPack。基本的な機能をお試しいただけます。', 'complete', NULL, 0, '{
  "voice": {
    "system": "読者に親しみやすく、実用的な情報を提供する一般的なライターとして記事を作成してください。"
  },
  "flow": {
    "critiqueRubric": "基本的な文章品質（紋切り句、冗長表現、曖昧さ）をチェック"
  }
}');

-- =====================================
-- トリガー（更新日時自動更新）
-- =====================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_packs_updated_at BEFORE UPDATE ON packs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pack_entitlements_updated_at BEFORE UPDATE ON pack_entitlements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();