/**
 * Message Contract Types (4W1B+P)
 * The core value structure that replaces the ineffective prompts system
 */

export interface Speaker {
  role: string;                      // "店舗オーナー", "コンサルタント", "専門家"
  brand: string;                     // ブランド名・屋号
  credibility: string[];             // 信頼性の根拠
  voice: string;                     // 語り口調の特徴
}

export interface Claim {
  headline: string;                  // メイン主張
  subpoints: string[];              // 補強ポイント
  uniqueness: string;               // 独自性・差別化要因
}

export interface Audience {
  persona: string;                  // ペルソナ定義
  jobs_to_be_done: string[];       // 解決したい課題
  objections: string[];             // 想定される反対意見・不安
  knowledge_level: number;          // 1-5の知識レベル
}

export interface Benefit {
  outcome: string[];                // 具体的な成果
  emotional: string[];              // 感情的価値
  functional: string[];             // 機能的価値
  social: string[];                 // 社会的価値
}

export interface Proof {
  evidence_type: 'data' | 'case_study' | 'testimonial' | 'research' | 'example';
  sources: string[];                // 根拠の出典
  metrics: string[];                // 数値・指標
  case_studies: string[];           // 事例
}

export interface Constraints {
  max_chars: number;                // 最大文字数
  min_chars: number;                // 最小文字数
  tone: {
    formality: number;              // 1-5 (カジュアル→フォーマル)
    energy: number;                 // 1-5 (落ち着いている→熱量高い)
    expertise: number;              // 1-5 (初心者向け→専門家向け)
    metaphor: number;               // 1-5 (直接的→比喩多用)
  };
  banned_words: string[];           // 禁止語
  required_elements: string[];      // 必須要素
  cta_type: 'visit' | 'purchase' | 'contact' | 'download' | 'subscribe';
  cta_copy: string;                 // CTA文言
}

export interface MessageContract {
  id: string;
  contract_id: string;
  name: string;
  speaker: Speaker;
  claim: Claim;
  audience: Audience;
  benefit: Benefit;
  proof: Proof;
  constraints: Constraints;
  price: number;
  is_free: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserMessageContract {
  id: string;
  user_id: string;
  contract_id: string;
  purchased_at: string;
  is_active: boolean;
  stripe_session_id?: string;
}

export interface MessageContractWithStatus extends MessageContract {
  purchased?: boolean;
  available?: boolean;
}

/**
 * Article Generation Request
 */
export interface GenerationRequest {
  contract: MessageContract;
  user_inputs: Record<string, string>;  // 動的入力値
  generation_settings: {
    target_length: number;
    include_toc: boolean;
    include_faq: boolean;
    include_examples: boolean;
  };
}

/**
 * Generated Article
 */
export interface GeneratedArticle {
  title: string;
  content: string;                  // Markdown形式
  meta_description: string;
  internal_links: string[];
  tags: string[];
  estimated_reading_time: number;
  verification_score: number;       // 0-100
  verification_details: VerificationResult;
}

/**
 * Article Verification Result
 */
export interface VerificationResult {
  score: number;                    // 0-100
  checks: {
    speaker_clear: boolean;         // 発信者が明確
    claim_clear: boolean;           // 主張が明確
    audience_targeted: boolean;     // ターゲットが明確
    benefit_concrete: boolean;      // ベネフィットが具体的
    proof_included: boolean;        // 根拠・証拠がある
    cta_natural: boolean;           // CTAが自然
    constraints_met: boolean;       // 制約条件遵守
    uniqueness_present: boolean;    // 独自性がある
  };
  reasons: string[];                // 不足・逸脱の理由
  needs_regeneration: boolean;
  fix_brief: string;                // 修正指示（短文）
}

/**
 * Dynamic Prompt Template
 */
export interface DynamicPrompt {
  system_prompt: string;
  user_prompt: string;
  verification_prompt: string;
  regeneration_prompt: string;
}