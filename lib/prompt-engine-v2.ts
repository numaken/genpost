/**
 * GenPost v2: Prompt Engine with Verification
 * Two-stage generation: Draft → Verification → Final Article
 */

import { 
  MessageContract, 
  GenerationRequest, 
  GeneratedArticle, 
  VerificationResult, 
  VerificationMetrics,
  GenerationAudit 
} from './contracts-v2';
import crypto from 'crypto';

// ============================================================================
// OpenAI Integration
// ============================================================================

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class OpenAIClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(messages: OpenAIMessage[], model: string, temperature = 0.7): Promise<OpenAIResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async getEmbedding(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000), // Limit for embedding
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI Embedding API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }
}

// ============================================================================
// Prompt Templates
// ============================================================================

class PromptTemplates {
  static systemPrompt(contract: MessageContract): string {
    return `あなたは${contract.speaker.role}として、${contract.speaker.brand}の専門知識を活かした記事を書く経験豊富なライターです。

信頼性の根拠: ${contract.speaker.credibility.join('、')}
専門分野: ${contract.speaker.expertise_area}
語り口: ${contract.speaker.voice}

常に以下の4W1B+P構造を満たす記事を書いてください：
- 誰が（Speaker）: ${contract.speaker.role}として
- 何を（Claim）: ${contract.claim.headline}
- 誰に（Audience）: ${contract.audience.persona}
- どんな得（Benefit）: ${contract.benefit.outcome.join('、')}
- 証拠（Proof）: ${contract.proof.evidence_type}による根拠を含める

記事構造: ${contract.output.structure}法則
トーン: ${this.getToneDescription(contract.tone)}
文字数: ${contract.constraints.min_chars}-${contract.constraints.max_chars}字`;
  }

  static draftPrompt(contract: MessageContract, keywords: string[]): string {
    const structure = contract.output.structure === 'PASONA' 
      ? this.getPASONAStructure() 
      : this.getSDSStructure();

    return `# 記事の下書き生成

## キーワード
今回のメインキーワード: ${keywords.join('、')}

## 対象読者の詳細
- ペルソナ: ${contract.audience.persona}
- 解決したい課題: ${contract.audience.jobs_to_be_done.join('、')}
- 想定される不安: ${contract.audience.objections.join('、')}
- 知識レベル: ${contract.audience.knowledge_level}/5

## 提供価値
- 具体的成果: ${contract.benefit.outcome.join('、')}
- 感情的価値: ${contract.benefit.emotional.join('、')}
- 達成期間: ${contract.benefit.timeline}

## 記事構成
${structure}

## 制約条件
- 禁止語: ${contract.constraints.banned_phrases.join('、')}
- 必須要素: ${contract.constraints.required_elements.join('、')}
- CTA: ${contract.constraints.cta_copy}

まず記事の構成案（見出しと各セクションの要点）を300字程度で簡潔にアウトライン形式で出力してください。`;
  }

  static expansionPrompt(contract: MessageContract, outline: string, keywords: string[]): string {
    return `以下のアウトラインを基に、完全な記事を執筆してください。

## アウトライン
${outline}

## 執筆指示
1. **導入**: 読者の${contract.audience.jobs_to_be_done[0]}の悩みから始める
2. **本文**: ${keywords.join('、')}を自然に織り込みながら展開
3. **根拠**: ${contract.proof.evidence_type}による証拠を必ず含める
4. **CTA**: ${contract.constraints.cta_copy}で自然に誘導

## 品質基準
- 口語調で親しみやすく（${contract.tone.formality}/5のフォーマル度）
- 専門性レベル${contract.tone.expertise}/5で執筆
- 具体例を${contract.constraints.include_examples ? '必ず' : '必要に応じて'}含める
- FAQ形式の質問を${contract.constraints.include_faq ? '必ず' : '必要に応じて'}含める

## 出力形式
Markdownで出力。H2、H3見出し、箇条書き、太字を適切に使用。
文字数: ${contract.constraints.min_chars}-${contract.constraints.max_chars}字`;
  }

  static verificationPrompt(contract: MessageContract, article: string): string {
    return `以下の記事を厳格に検証し、JSON形式で評価結果を返してください。

## 検証対象記事
${article}

## 検証基準（各項目0-1で評価）

### 1. Coverage（4W1B+P網羅度）
- 発信者（${contract.speaker.role}）として語っているか
- 主張（${contract.claim.headline}）が明確か
- 対象（${contract.audience.persona}）に向けているか  
- ベネフィット（${contract.benefit.outcome.join('、')}）が具体的か
- 証拠（${contract.proof.evidence_type}）が含まれているか

### 2. Relevance（キーワード関連性）
- メインキーワードが自然に組み込まれているか
- 読者の課題（${contract.audience.jobs_to_be_done.join('、')}）に答えているか

### 3. Novelty（独自性）
- ありふれた内容でないか
- ${contract.claim.uniqueness}が表現されているか

### 4. Readability（読みやすさ）
- 文章が自然で読みやすいか
- 論理的な構成になっているか
- 専門用語の説明が適切か

### 5. CTA Strength（行動喚起）
- CTAが自然に配置されているか
- 「${contract.constraints.cta_copy}」に近い誘導があるか

### 6. Proof Quality（根拠の質）
- 信頼できる根拠が示されているか
- 具体的な数値や事例があるか

### 7. Tone Match（トーン一致度）
- 指定されたトーン（フォーマル度${contract.tone.formality}/5）と一致しているか

### 8. Constraint Compliance（制約遵守）
- 文字数制限（${contract.constraints.min_chars}-${contract.constraints.max_chars}字）を満たしているか
- 禁止語（${contract.constraints.banned_phrases.join('、')}）を使っていないか

## 出力形式（JSON）
{
  "total_score": 0.85,
  "metrics": {
    "coverage": 0.9,
    "relevance": 0.85,
    "novelty": 0.8,
    "readability": 0.9,
    "cta_strength": 0.75,
    "proof_quality": 0.85,
    "tone_match": 0.9,
    "constraint_compliance": 0.95
  },
  "passed": true,
  "suggestions": ["具体例をもう1つ追加", "CTAをより自然に"],
  "regeneration_needed": false,
  "fix_instructions": ""
}`;
  }

  private static getToneDescription(tone: any): string {
    const personalityMap: { [key: string]: string } = {
      'friendly': '親しみやすく',
      'professional': '専門的で',
      'enthusiastic': '熱意を込めて',
      'authoritative': '権威的に'
    }
    const personality = personalityMap[tone.personality] || '親しみやすく';

    return `${personality}、フォーマル度${tone.formality}/5、熱量${tone.energy}/5で`;
  }

  private static getPASONAStructure(): string {
    return `PASONA法則に基づく構成：
1. **Problem（問題提起）**: 読者の悩みを明確化
2. **Agitation（共感・煽り）**: 問題の深刻さを共感的に表現
3. **Solution（解決策）**: 具体的な解決方法を提示
4. **Narrow（限定性）**: 特別感や緊急性を演出
5. **Action（行動喚起）**: 明確なCTAで次のステップを提示`;
  }

  private static getSDSStructure(): string {
    return `SDS法則に基づく構成：
1. **Summary（要約）**: 結論・要点を最初に明確に提示
2. **Details（詳細）**: 根拠・手順・具体例を詳しく説明
3. **Summary（要約）**: 再度要点をまとめ、行動を促進`;
  }
}

// ============================================================================
// Main Engine Class
// ============================================================================

export class PromptEngineV2 {
  private openai: OpenAIClient;
  
  constructor(apiKey: string) {
    this.openai = new OpenAIClient(apiKey);
  }

  /**
   * Two-stage article generation with verification
   */
  async generateArticle(request: GenerationRequest): Promise<{
    article: GeneratedArticle;
    verification: VerificationResult;
    audit: GenerationAudit;
  }> {
    const startTime = Date.now();
    const { contract, keywords, model = 'gpt-4o-mini', max_retries = 2 } = request;
    
    let attempt = 0;
    let bestResult: any = null;
    let bestScore = 0;

    while (attempt <= max_retries) {
      try {
        // Stage 1: Generate draft outline
        const outline = await this.generateDraft(contract, keywords, model);
        
        // Stage 2: Expand to full article
        const article = await this.expandArticle(contract, outline, keywords, model);
        
        // Stage 3: Verification
        const verification = await this.verifyArticle(contract, article, model);
        
        // If score is good enough, use this result
        if (verification.total_score >= (verification.pass_threshold || 0.78)) {
          const generationTime = Date.now() - startTime;
          const audit = await this.createAudit(contract, keywords, model, verification, generationTime, attempt);
          
          return {
            article: await this.createArticleRecord(contract, article, keywords, verification, audit.id),
            verification,
            audit
          };
        }
        
        // Keep track of best result
        if (verification.total_score > bestScore) {
          bestScore = verification.total_score;
          bestResult = { outline, article, verification };
        }
        
        attempt++;
      } catch (error) {
        console.error(`Generation attempt ${attempt} failed:`, error);
        attempt++;
      }
    }
    
    // Use best result even if below threshold
    if (bestResult) {
      const generationTime = Date.now() - startTime;
      const audit = await this.createAudit(contract, keywords, model, bestResult.verification, generationTime, attempt - 1);
      
      return {
        article: await this.createArticleRecord(contract, bestResult.article, keywords, bestResult.verification, audit.id),
        verification: bestResult.verification,
        audit
      };
    }
    
    throw new Error('Failed to generate article after all retries');
  }

  private async generateDraft(contract: MessageContract, keywords: string[], model: string): Promise<string> {
    const messages: OpenAIMessage[] = [
      { role: 'system', content: PromptTemplates.systemPrompt(contract) },
      { role: 'user', content: PromptTemplates.draftPrompt(contract, keywords) }
    ];

    const response = await this.openai.chat(messages, model, 0.7);
    return response.choices[0].message.content;
  }

  private async expandArticle(contract: MessageContract, outline: string, keywords: string[], model: string): Promise<string> {
    const messages: OpenAIMessage[] = [
      { role: 'system', content: PromptTemplates.systemPrompt(contract) },
      { role: 'user', content: PromptTemplates.expansionPrompt(contract, outline, keywords) }
    ];

    const response = await this.openai.chat(messages, model, 0.6);
    return response.choices[0].message.content;
  }

  private async verifyArticle(contract: MessageContract, article: string, model: string): Promise<VerificationResult> {
    const messages: OpenAIMessage[] = [
      { 
        role: 'system', 
        content: 'You are a strict editorial reviewer. Analyze articles objectively and return only valid JSON.' 
      },
      { role: 'user', content: PromptTemplates.verificationPrompt(contract, article) }
    ];

    const response = await this.openai.chat(messages, model, 0.1);
    
    try {
      // Extract JSON from response
      const jsonMatch = response.choices[0].message.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in verification response');
      }
      
      const verification = JSON.parse(jsonMatch[0]);
      
      // Ensure all required fields are present
      return {
        total_score: verification.total_score || 0,
        metrics: verification.metrics || {},
        pass_threshold: 0.78,
        passed: (verification.total_score || 0) >= 0.78,
        suggestions: verification.suggestions || [],
        regeneration_needed: verification.regeneration_needed || false,
        fix_instructions: verification.fix_instructions
      };
    } catch (error) {
      console.error('Failed to parse verification result:', error);
      
      // Return default verification result
      return {
        total_score: 0.5,
        metrics: {
          coverage: 0.5,
          relevance: 0.5,
          novelty: 0.5,
          readability: 0.5,
          cta_strength: 0.5,
          proof_quality: 0.5,
          tone_match: 0.5,
          constraint_compliance: 0.5
        },
        pass_threshold: 0.78,
        passed: false,
        suggestions: ['Verification system error - manual review needed'],
        regeneration_needed: false
      };
    }
  }

  private async createAudit(
    contract: MessageContract, 
    keywords: string[], 
    model: string, 
    verification: VerificationResult,
    generationTime: number,
    retries: number
  ): Promise<GenerationAudit> {
    const promptHash = crypto
      .createHash('md5')
      .update(`${contract.contract_id}@${contract.contract_version}:${keywords.join(',')}`)
      .digest('hex');

    return {
      id: crypto.randomUUID(),
      contract_ref: `${contract.contract_id}@${contract.contract_version}`,
      user_id: contract.created_by,
      prompt_hash: promptHash,
      model: model,
      keywords_used: keywords,
      metrics: verification.metrics,
      verification_score: verification.total_score,
      cost_estimate_cents: this.estimateCost(model, 3000), // Rough estimate
      generation_time_ms: generationTime,
      retries: retries,
      created_at: new Date().toISOString()
    };
  }

  private async createArticleRecord(
    contract: MessageContract,
    content: string,
    keywords: string[],
    verification: VerificationResult,
    auditId: string
  ): Promise<GeneratedArticle> {
    // Extract title from content (first H1)
    const titleMatch = content.match(/^# (.+)$/m);
    const title = titleMatch ? titleMatch[1] : `${keywords[0]}に関する記事`;
    
    // Generate meta description
    const metaDescription = content
      .replace(/[#*\n]/g, ' ')
      .substring(0, 160)
      .trim();
    
    // Extract links
    const internalLinks = this.extractLinks(content, 'internal');
    const externalLinks = this.extractLinks(content, 'external');
    
    // Generate vectors for deduplication
    const titleVector = await this.openai.getEmbedding(title);
    const contentVector = await this.openai.getEmbedding(content.substring(0, 1000));

    return {
      id: crypto.randomUUID(),
      user_id: contract.created_by,
      title,
      content,
      meta_description: metaDescription,
      primary_keyword: keywords[0],
      secondary_keywords: keywords.slice(1),
      internal_links: internalLinks,
      external_links: externalLinks,
      title_vector: titleVector,
      content_vector: contentVector,
      language: 'ja',
      estimated_reading_time: Math.ceil(content.length / 400), // 400 chars/minute for Japanese
      verification_result: verification,
      generation_audit_id: auditId,
      created_at: new Date().toISOString()
    };
  }

  private extractLinks(content: string, type: 'internal' | 'external'): string[] {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links: string[] = [];
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      const url = match[2];
      const isExternal = url.startsWith('http://') || url.startsWith('https://');
      
      if ((type === 'external' && isExternal) || (type === 'internal' && !isExternal)) {
        links.push(url);
      }
    }

    return links;
  }

  private estimateCost(model: string, tokenCount: number): number {
    // Rough cost estimation in cents
    const costs = {
      'gpt-4o-mini': 0.00015, // per 1k tokens
      'gpt-4o': 0.005
    };

    return Math.ceil((tokenCount / 1000) * (costs[model as keyof typeof costs] || costs['gpt-4o-mini']) * 100);
  }

  /**
   * Check similarity against existing articles to prevent duplicates
   */
  async checkSimilarity(newVector: number[], existingVectors: number[][]): Promise<number> {
    if (existingVectors.length === 0) return 0;

    const similarities = existingVectors.map(existing => 
      this.cosineSimilarity(newVector, existing)
    );

    return Math.max(...similarities);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}