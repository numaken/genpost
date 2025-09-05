/**
 * GenPost v2: 4W1B+P × 8+1 Message Contracts
 * Core types and interfaces for the contract-based generation system
 */

// ============================================================================
// 4W1B+P Core Elements
// ============================================================================

export interface Speaker {
  role: string;                      // "整体院経営者", "Webコンサルタント"
  brand: string;                     // ブランド名・屋号
  credibility: string[];             // ["10年の実績", "100社のサポート実績"]
  voice: string;                     // "親しみやすく実践的"
  expertise_area: string;            // 専門分野
}

export interface Claim {
  headline: string;                  // メイン主張（テンプレート変数含む）
  subpoints: string[];              // 補強ポイント
  uniqueness: string;               // 独自性・差別化要因
  supporting_facts: string[];       // 支持する事実
}

export interface Audience {
  persona: string;                  // "30代働く女性"
  jobs_to_be_done: string[];       // ["肩こり解消", "ストレス軽減"] 
  objections: string[];             // ["時間がない", "効果が不安"]
  knowledge_level: number;          // 1-5の専門知識レベル
  pain_points: string[];           // 具体的な悩み
  desired_outcomes: string[];      // 望む結果
}

export interface Benefit {
  outcome: string[];                // 具体的な成果
  emotional: string[];              // 感情的価値
  functional: string[];             // 機能的価値  
  social: string[];                 // 社会的価値
  transformation: string;           // ビフォーアフター
  timeline: string;                 // "2週間で", "1ヶ月以内に"
}

export interface Proof {
  evidence_type: 'data' | 'case_study' | 'testimonial' | 'research' | 'example' | 'before_after';
  sources: string[];                // 根拠の出典
  metrics: string[];                // 数値・指標
  case_studies: string[];           // 事例
  testimonials: string[];           // お客様の声
  certifications: string[];         // 資格・認定
}

// ============================================================================
// 8+1 Configuration Elements  
// ============================================================================

export interface ToneSettings {
  formality: number;                // 1-5 (カジュアル→フォーマル)
  energy: number;                   // 1-5 (落ち着いている→熱量高い)
  expertise: number;                // 1-5 (初心者向け→専門家向け)
  metaphor: number;                 // 1-5 (直接的→比喩多用)
  personality: 'friendly' | 'professional' | 'enthusiastic' | 'authoritative';
}

export interface GenerationConstraints {
  max_chars: number;                // 最大文字数
  min_chars: number;                // 最小文字数  
  banned_phrases: string[];         // 禁止語句
  required_elements: string[];      // 必須要素
  cta_type: 'contact' | 'visit' | 'purchase' | 'download' | 'subscribe' | 'consultation';
  cta_copy: string;                 // CTA文言
  include_faq: boolean;             // FAQ含める
  include_examples: boolean;        // 具体例含める
}

export interface OutputSettings {
  format: 'markdown' | 'html';
  structure: 'PASONA' | 'SDS';      // 記事構成
  include_toc: boolean;             // 目次含める
  include_meta: boolean;            // メタディスクリプション生成
  wordpress_ready: boolean;        // WordPress投稿形式
}

// ============================================================================
// Message Contract (Main Entity)
// ============================================================================

export interface MessageContract {
  id: string;
  contract_id: string;
  contract_version: string;
  status: 'active' | 'draft' | 'archived';
  
  // Core 4W1B+P
  speaker: Speaker;                 // 誰が
  claim: Claim;                     // 何を
  audience: Audience;               // 誰に
  benefit: Benefit;                 // どんな得
  proof: Proof;                     // 証拠
  
  // 8+1 Configuration  
  tone: ToneSettings;
  constraints: GenerationConstraints;
  output: OutputSettings;
  magic_hints: string[];            // +1 魔法要素のヒント
  
  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Schedule & Job Management
// ============================================================================

export interface Schedule {
  id: string;
  user_id: string;
  site_id: string;
  contract_id: string;
  contract_version: string;
  
  // WordPress Integration
  wp_site_url: string;
  category_slug: string;
  post_status: 'publish' | 'draft';
  
  // Generation Settings
  post_count: number;
  cron: string;                     // "0 18 * * *"
  tz: string;                       // "Asia/Tokyo"
  
  // Keyword Management
  keyword_pool: string[];           // ユーザー入力のキーワード集合
  used_keyword_sets: string[][];    // 使用済みキーワード組み合わせ  
  current_keyword_index: number;
  
  // Status
  status: 'active' | 'paused' | 'completed';
  last_generated_at?: string;
  next_generation_at?: string;
  
  created_at: string;
  updated_at: string;
}

export interface PublishJob {
  id: string;
  schedule_id: string;
  
  // Timing
  planned_at: string;
  started_at?: string;
  finished_at?: string;
  
  // Status
  state: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  retry_count: number;
  max_retries: number;
  
  // Generation Data
  keywords_used?: string[];
  article_title?: string;
  article_content?: string;
  article_id?: string;
  
  // WordPress Data
  wp_post_id?: number;
  wp_post_url?: string;
  
  // Error Handling
  error_message?: string;
  error_details?: Record<string, any>;
  
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Generation & Verification
// ============================================================================

export interface GenerationRequest {
  contract: MessageContract;
  keywords: string[];               // 今回使用するキーワード
  model: 'gpt-4o-mini' | 'gpt-4o';
  temperature?: number;
  max_retries?: number;
}

export interface VerificationMetrics {
  coverage: number;                 // 4W1B+P要素の網羅度 (0-1)
  relevance: number;                // キーワードとの関連性 (0-1)
  novelty: number;                  // 既存記事との差異 (0-1)  
  readability: number;              // 読みやすさスコア (0-1)
  cta_strength: number;             // CTA の自然さ・強度 (0-1)
  proof_quality: number;            // 根拠の質 (0-1)
  tone_match: number;               // 指定トーンとの一致度 (0-1)
  constraint_compliance: number;    // 制約条件遵守度 (0-1)
}

export interface VerificationResult {
  total_score: number;              // 0-1 の総合スコア
  metrics: VerificationMetrics;
  pass_threshold: number;           // 合格基準 (default: 0.78)
  passed: boolean;
  suggestions: string[];            // 改善提案
  regeneration_needed: boolean;
  fix_instructions?: string;        // 再生成時の修正指示
}

export interface GeneratedArticle {
  id: string;
  user_id: string;
  schedule_id?: string;
  job_id?: string;
  
  // Content
  title: string;
  content: string;                  // Markdown format
  excerpt?: string;
  meta_description?: string;
  
  // SEO & Structure  
  primary_keyword: string;
  secondary_keywords: string[];
  internal_links: string[];
  external_links: string[];
  
  // Similarity Vectors (for deduplication)
  title_vector?: number[];
  content_vector?: number[];
  
  // WordPress Integration
  wp_post_id?: number;
  wp_category_id?: number;
  wp_featured_image_url?: string;
  
  // Metadata
  language: string;
  estimated_reading_time: number;   // minutes
  
  // Quality & Audit
  verification_result: VerificationResult;
  generation_audit_id?: string;
  
  created_at: string;
  published_at?: string;
}

export interface GenerationAudit {
  id: string;
  contract_ref: string;             // "contract_id@version"
  job_id?: string;
  user_id: string;
  
  // Generation Details
  prompt_hash: string;
  model: string;
  keywords_used: string[];
  
  // Quality Metrics
  metrics: VerificationMetrics;
  verification_score: number;
  similarity_score?: number;
  
  // Cost & Performance
  cost_estimate_cents: number;
  generation_time_ms?: number;
  retries: number;
  
  // Content Info
  title_generated?: string;
  char_count?: number;
  word_count?: number;
  
  created_at: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateContractRequest {
  contract_id: string;
  name: string;
  speaker: Speaker;
  claim: Claim;
  audience: Audience; 
  benefit: Benefit;
  proof: Proof;
  tone?: ToneSettings;
  constraints?: GenerationConstraints;
  output?: OutputSettings;
  magic_hints?: string[];
}

export interface CreateScheduleRequest {
  site_id: string;
  contract_id: string;
  wp_site_url: string;
  category_slug: string;
  post_count: number;
  cron: string;
  keyword_pool: string[];
  post_status?: 'publish' | 'draft';
}

export interface GenerateArticleRequest {
  contract_id: string;
  keywords?: string[];              // Optional override
  model?: 'gpt-4o-mini' | 'gpt-4o';
  dry_run?: boolean;                // Preview only, don't save
}

export interface GenerateArticleResponse {
  success: boolean;
  article?: GeneratedArticle;
  verification?: VerificationResult;
  audit_id?: string;
  error?: string;
}

// ============================================================================
// WordPress Integration
// ============================================================================

export interface WordPressPublishRequest {
  title: string;
  content: string;
  category_slug: string;
  featured_image_url?: string;
  status: 'publish' | 'draft';
  meta_description?: string;
  tags?: string[];
}

export interface WordPressPublishResponse {
  success: boolean;
  post_id?: number;
  post_url?: string;
  error?: string;
}

// ============================================================================
// Job System
// ============================================================================

export interface JobLock {
  lock_key: string;
  locked_at: string;
  expires_at: string;
  locked_by?: string;
}

export interface JobWorkerConfig {
  worker_id: string;
  max_concurrent_jobs: number;
  lock_timeout_minutes: number;
  retry_exponential_base: number;   // 2 for exponential backoff
  max_retry_delay_minutes: number;
}

// ============================================================================  
// Utility Types
// ============================================================================

export type ContractStatus = MessageContract['status'];
export type ScheduleStatus = Schedule['status'];  
export type JobState = PublishJob['state'];
export type ArticleStructure = OutputSettings['structure'];
export type EvidenceType = Proof['evidence_type'];
export type CTAType = GenerationConstraints['cta_type'];

// Partial types for updates
export type MessageContractUpdate = Partial<Omit<MessageContract, 'id' | 'created_at' | 'created_by'>>;
export type ScheduleUpdate = Partial<Omit<Schedule, 'id' | 'user_id' | 'created_at'>>;

// Template expansion helpers
export type KeywordTemplate = string; // Contains {{keyword}} placeholders
export type ExpandedTemplate = string; // After keyword substitution

// Error types
export interface ContractError extends Error {
  code: 'VALIDATION_ERROR' | 'GENERATION_ERROR' | 'VERIFICATION_ERROR' | 'PUBLISH_ERROR';
  details?: Record<string, any>;
}

// Configuration presets for quick setup
export interface ContractPreset {
  name: string;
  description: string;
  industry: string;
  template: Partial<MessageContract>;
  example_keywords: string[];
}

export const DEFAULT_TONE: ToneSettings = {
  formality: 2,
  energy: 4,
  expertise: 3,
  metaphor: 2,
  personality: 'friendly'
};

export const DEFAULT_CONSTRAINTS: GenerationConstraints = {
  max_chars: 2000,
  min_chars: 1200,
  banned_phrases: ['絶対', '100%保証', '誰でも簡単'],
  required_elements: ['具体例', 'CTA', '根拠'],
  cta_type: 'contact',
  cta_copy: 'お気軽にご相談ください',
  include_faq: false,
  include_examples: true
};

export const DEFAULT_OUTPUT: OutputSettings = {
  format: 'markdown',
  structure: 'PASONA',
  include_toc: false,
  include_meta: true,
  wordpress_ready: true
};