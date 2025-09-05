# GenPost 仕様書
## 怠け者向け自動集客ブログ生成システム

### 1. 概要

**GenPostは「金儲けしたい怠け者」のための自動集客ブログ生成SaaS**

#### 1.1 対象ユーザー
- 個人事業主・小規模事業者
- ブログで集客したいが記事を書くのが面倒
- 継続的なネタ切れに悩んでいる
- 手間をかけずにアテンション（注目）を獲得したい

#### 1.2 提供価値
- **一度設定するだけ**で30日分の集客記事を自動生成・投稿
- **重複なし保証**で毎日違うネタの記事を配信
- **口語×PASONA法則**で親近感と行動喚起を両立
- **WordPressプラグイン連携**で完全自動化

---

### 2. コア機能仕様

#### 2.1 8+1プロンプト設計システム

**重要：ユーザーは8つの選択をするだけ。キーワードを1つ入力するだけ。システムが自動で記事を生成する。**

**8要素（プルダウンで選択・1回設定のみ）：**

**1. 目的（何のために記事を書くか）**
```
選択肢: 
□ 集客（新規顧客を獲得したい）
□ 信頼構築（専門家として認知されたい）  
□ 教育（知識を教えて関係性を作りたい）
□ セールス（商品・サービスを売りたい）
```

**2. 対象読者（誰に向けて書くか）**
```
選択肢:
□ 20代女性（美容・ファッション関心層）
□ 30代女性（キャリア・育児両立層）
□ 40代男性（管理職・健康関心層）
□ 経営者・個人事業主（売上・効率化関心層）
□ 主婦（家計・時短関心層）
```

**3. 前提条件（あなたの業種）**
```
選択肢:
□ 整体院・マッサージ
□ 美容院・エステ
□ 税理士・会計士
□ コンサルタント
□ 飲食店
□ 不動産
□ IT・Web制作
□ 教育・スクール
```

**4. 制約条件（記事の長さ）**
```
選択肢:
□ 短め（1200文字・3分で読める）
□ 標準（2000文字・5分で読める）
□ 長め（3000文字・8分で読める）
```

**5. 構成（記事の流れ）**
```
選択肢:
□ PASONA法則（問題提起→煽り→解決策→限定→行動喚起）
□ SDS法則（要約→詳細→要約で分かりやすく）
```

**6. トーン（話し方の雰囲気）**
```
選択肢:
□ 親しみやすい（「ですます調」で優しく）
□ 専門的（「である調」で権威性重視）
□ 熱血（「〜しましょう！」で熱く）
□ クール（「〜です。」で冷静に）
```

**7. 例示（参考にする記事タイプ）**
```
→ 業種×目的で自動選択されるため、ユーザーは選択不要
例：整体院×集客 = 「症状改善事例＋予約誘導」パターン
```

**8. 出力形式（投稿先）**
```
→ WordPress投稿形式で固定（ユーザー選択不要）
```

**+1要素（魔法要素・キーワード入力）：**

**ユーザーが入力する唯一の項目：**
```
キーワード入力例:
「腰痛、肩こり、頭痛、姿勢、ストレッチ、骨盤、猫背」

システムの処理:
Day 1: 「腰痛」+「30代女性」+「デスクワーク」で記事生成
Day 2: 「肩こり」+「ストレス」+「在宅勤務」で記事生成  
Day 3: 「頭痛」+「睡眠不足」+「スマホ」で記事生成
...
30日間、違うキーワード組み合わせで記事を自動生成
```

**実際のユーザー操作画面イメージ：**
```
┌─────────────────────────┐
│ 1. 目的: 集客 ▼           │
│ 2. 対象: 30代女性 ▼       │  
│ 3. 業種: 整体院 ▼         │
│ 4. 長さ: 標準 ▼           │
│ 5. 構成: PASONA ▼         │
│ 6. トーン: 親しみやすい ▼  │
│                           │
│ キーワード（カンマ区切り）: │
│ 腰痛,肩こり,頭痛,ストレッチ │
│                           │
│ [30記事を自動生成開始]     │
└─────────────────────────┘
```

#### 2.2 重複回避システム

**技術仕様：**
- 生成済み記事タイトルをベクトル化（OpenAI Embeddings）
- 新規生成時にコサイン類似度チェック（閾値: 0.85）
- 類似度が高い場合は自動で別のキーワード組み合わせを試行
- 最大5回リトライ後、手動確認フラグを立てる

**データ構造：**
```typescript
interface GeneratedArticle {
  id: string
  user_id: string
  title: string
  content: string
  keywords_used: string[]
  similarity_vector: number[]
  published_at: string
  wordpress_post_id: number
}
```

#### 2.3 スケジュール投稿システム

**設定項目：**
- **記事数**: 10本/20本/30本（選択式）
- **投稿頻度**: 毎日/2日に1回/週3回（選択式）
- **投稿時間**: 8時/12時/18時/21時（選択式）
- **投稿期間**: 開始日から自動計算

**技術仕様：**
- cron job または Queue システムで定時実行
- WordPress REST API v2 使用
- 投稿失敗時は3回リトライ + 管理者通知

---

### 3. システム構成

#### 3.1 フロントエンド（Next.js 14）

**主要画面：**

1. **ダッシュボード**
   - 投稿スケジュール表示
   - 生成記事数/残り記事数
   - WordPressサイト連携状況

2. **初期設定画面**
   - 8要素の選択UI（プルダウン中心）
   - キーワードセット入力（テキストエリア）
   - 生成・投稿設定

3. **記事プレビュー画面**
   - 生成済み記事の確認・編集
   - 個別記事の公開/非公開切り替え

**UI/UX要件：**
- **超シンプル**: 各設定項目は3-5個の選択肢のみ
- **スマホ対応**: 全機能がモバイルで操作可能
- **ワンクリック設定**: 推奨設定を1ボタンで適用

#### 3.2 バックエンド（Next.js API Routes）

**主要エンドポイント：**

```
POST /api/setup-generation
- 8+1設定を保存
- 初回記事生成キューを作成

POST /api/generate-article
- キーワード組み合わせから記事生成
- 重複チェック実行
- スケジュール登録

POST /api/wordpress-publish
- WordPress REST API連携
- 記事投稿 + カテゴリ設定
- 投稿結果の記録

GET /api/generation-status
- 生成進捗・投稿状況の取得
- エラーログの表示
```

#### 3.3 WordPress プラグイン

**ファイル名**: `genpost-connector.php`

**機能：**
1. **設定画面追加**
   ```php
   // WordPress管理画面に「GenPost設定」メニュー追加
   add_menu_page('GenPost設定', 'GenPost', 'manage_options', 'genpost-settings');
   ```

2. **カテゴリ連携**
   ```php
   // 投稿カテゴリ一覧をGenPostに送信するAPI
   function genpost_get_categories() {
       return get_categories(['hide_empty' => false]);
   }
   ```

3. **自動投稿受信**
   ```php
   // GenPostからの記事投稿を受信・処理
   add_action('rest_api_init', 'genpost_register_endpoints');
   ```

**設定項目：**
- GenPost API キー
- 投稿カテゴリ選択
- 投稿者設定
- カスタムフィールド設定

---

### 4. 記事生成ロジック

#### 4.1 PASONA法則テンプレート

**構造：**
```markdown
# {キーワード1}でお悩みの{対象}の方へ

## Problem（問題提起）
こんなこと、ありませんか？
- {キーワード1}で困っている
- {キーワード2}も気になる
- {具体的な困りごと}

## Agitation（共感・煽り）
実は私も同じでした...
{体験談・共感エピソード}

## Solution（解決策）
でも、{解決方法}を知ってから変わりました
{具体的なソリューション提示}

## Narrow（限定性）
ただし、{注意点・限定条件}
今なら{特別オファー}

## Action（行動喚起）
{業種}の専門家として、あなたをサポートします
{CTA}
```

#### 4.2 キーワード展開ロジック

**例：整体院 × 腰痛**
```javascript
const keywordSets = [
  ['腰痛', '30代女性', 'デスクワーク'],
  ['肩こり', '40代男性', 'ストレス'],  
  ['頭痛', '20代女性', '睡眠不足'],
  ['猫背', '学生', 'スマホ'],
  ['骨盤', '産後', '育児']
]

// 重複チェック後、順次使用
```

**バリエーション生成：**
- 季節要素の自動挿入（夏→クーラー、冬→寒さ等）
- 地域要素の組み込み（渋谷、新宿等）
- トレンド要素の追加（リモートワーク等）

---

### 5. 技術スタック

#### 5.1 メイン技術
- **フロントエンド**: Next.js 14, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes, TypeScript  
- **データベース**: Supabase (PostgreSQL)
- **認証**: NextAuth.js (Google OAuth)
- **AI**: OpenAI GPT-4o-mini
- **ホスティング**: Vercel

#### 5.2 外部連携
- **WordPress REST API v2**: 記事自動投稿
- **OpenAI Embeddings API**: 重複記事検出
- **Stripe**: 決済処理
- **Queue System**: 記事生成・投稿の非同期処理

#### 5.3 WordPress プラグイン
- **言語**: PHP 8.0+
- **フレームワーク**: WordPress Plugin API
- **UI**: WordPress Admin UI コンポーネント

---

### 6. データベース設計

#### 6.1 主要テーブル

**users（ユーザー）**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW()
);
```

**generation_settings（生成設定）**
```sql
CREATE TABLE generation_settings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  purpose VARCHAR(50), -- 目的
  target_audience VARCHAR(100), -- 対象
  business_type VARCHAR(100), -- 業種
  tone VARCHAR(50), -- トーン
  article_length VARCHAR(20), -- 文字数
  structure VARCHAR(20), -- 構成(PASONA/SDS)
  keywords TEXT[], -- キーワードセット
  article_count INTEGER, -- 生成記事数
  posting_frequency VARCHAR(20), -- 投稿頻度
  posting_time TIME, -- 投稿時間
  wordpress_site_id UUID REFERENCES wordpress_sites(id),
  category_id INTEGER, -- WordPress カテゴリID
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**generated_articles（生成記事）**
```sql
CREATE TABLE generated_articles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  setting_id UUID REFERENCES generation_settings(id),
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  keywords_used TEXT[],
  similarity_vector FLOAT[],
  scheduled_at TIMESTAMP,
  published_at TIMESTAMP,
  wordpress_post_id INTEGER,
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled/published/failed
  created_at TIMESTAMP DEFAULT NOW()
);
```

**wordpress_sites（WordPressサイト）**
```sql
CREATE TABLE wordpress_sites (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  site_name VARCHAR(255) NOT NULL,
  site_url VARCHAR(500) NOT NULL,
  wp_username VARCHAR(255) NOT NULL,
  wp_app_password VARCHAR(500) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 7. ユーザーフロー

#### 7.1 初回設定フロー
1. **アカウント登録** (Google OAuth)
2. **WordPressサイト連携**
   - サイトURL入力
   - アプリケーションパスワード設定
   - 接続テスト
3. **記事生成設定**
   - 業種選択（プルダウン）
   - 対象読者選択（プルダウン）
   - トーン選択（プルダウン）
   - キーワード入力（5-10個推奨）
4. **投稿設定**
   - 記事数選択（10/20/30本）
   - 投稿頻度選択
   - 投稿時間選択
   - カテゴリ選択
5. **設定完了・生成開始**

#### 7.2 日常運用フロー
1. **自動記事生成** (バックグラウンド)
2. **自動投稿** (スケジュール)
3. **進捗確認** (ダッシュボード)
4. **記事編集** (必要に応じて)

---

### 8. 料金プラン

| プラン | 月額 | 記事数/月 | サイト数 | 特徴 |
|--------|------|-----------|----------|------|
| フリー | ¥0 | 5記事 | 1サイト | お試し用 |
| スタンダード | ¥2,980 | 30記事 | 2サイト | 個人事業主向け |
| プロ | ¥5,980 | 100記事 | 5サイト | 複数事業者向け |
| エージェンシー | ¥12,800 | 300記事 | 20サイト | 代行業者向け |

---

### 9. 開発マイルストーン

#### Phase 1: MVP（最小機能）
- [ ] ユーザー認証システム
- [ ] 基本的な記事生成機能  
- [ ] WordPressサイト連携
- [ ] 重複チェック機能

#### Phase 2: 自動化
- [ ] スケジュール投稿機能
- [ ] WordPressプラグイン開発
- [ ] ダッシュボード UI
- [ ] 決済システム連携

#### Phase 3: 最適化
- [ ] 記事品質向上（A/Bテスト）
- [ ] パフォーマンス最適化
- [ ] 分析・レポート機能
- [ ] モバイルアプリ検討

---

### 10. 成功指標（KPI）

- **ユーザー継続率**: 月次80%以上
- **記事投稿成功率**: 95%以上  
- **重複記事率**: 5%以下
- **ユーザー満足度**: NPS 50以上
- **ARR成長率**: 月次20%以上

---

### 11. 競合差別化

| 項目 | ChatGPT | 他ツール | GenPost |
|------|---------|----------|---------|
| 設定の簡単さ | ❌ 毎回プロンプト | ⚠️ 複雑設定 | ✅ 一度設定で完了 |
| 記事の継続性 | ❌ ネタ切れ | ⚠️ テンプレ依存 | ✅ 重複なし自動生成 |
| WordPress連携 | ❌ 手動コピペ | ⚠️ 一部対応 | ✅ 完全自動投稿 |
| 集客効果 | ⚠️ 文語的 | ⚠️ 汎用的 | ✅ 口語×PASONA |
| 運用コスト | ❌ 高頻度作業 | ⚠️ 定期メンテ | ✅ 完全放置可能 |

**GenPost独自価値**: 「怠け者でも継続的な集客ブログを完全自動化」

---

*最終更新: 2025年9月5日*