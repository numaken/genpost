-- 重複排除システム用のテーブル作成
-- article_embeddings: 記事のベクトル化データを保存
-- articles: 記事のメタデータを保存

-- 記事embeddingテーブル（存在チェック付き安全DDL）
CREATE TABLE IF NOT EXISTS article_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  article_id uuid,
  key text NOT NULL,
  vector jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 記事テーブル（存在チェック付き安全DDL）
CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  markdown text NOT NULL,
  meta jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(slug)
);

-- インデックスの作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_article_embeddings_user_id ON article_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_article_embeddings_created_at ON article_embeddings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_user_id ON articles(user_id);
CREATE INDEX IF NOT EXISTS idx_articles_title ON articles(title);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);

-- RLS (Row Level Security) の設定
ALTER TABLE article_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: ユーザーは自分のデータのみアクセス可能
DROP POLICY IF EXISTS "Users can only access their own embeddings" ON article_embeddings;
CREATE POLICY "Users can only access their own embeddings" ON article_embeddings
  FOR ALL USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can only access their own articles" ON articles;
CREATE POLICY "Users can only access their own articles" ON articles
  FOR ALL USING (auth.uid()::text = user_id);