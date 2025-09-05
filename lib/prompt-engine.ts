/**
 * Dynamic Prompt Engine
 * Generates prompts from Message Contracts instead of static templates
 */

import { MessageContract, GenerationRequest, DynamicPrompt, VerificationResult } from './message-contracts';

export class PromptEngine {
  /**
   * Generate 8+1 structured prompt from message contract
   */
  static generatePrompt(contract: MessageContract, userInputs: Record<string, string> = {}): DynamicPrompt {
    const systemPrompt = `You are an expert content writer specialized in creating articles that deliver clear value to specific audiences. You always ensure that every article answers: WHO (speaker), WHAT (claim), TO WHOM (audience), and WHAT BENEFIT they get.`;

    const userPrompt = this.buildMainPrompt(contract, userInputs);
    const verificationPrompt = this.buildVerificationPrompt(contract);
    const regenerationPrompt = this.buildRegenerationPrompt(contract);

    return {
      system_prompt: systemPrompt,
      user_prompt: userPrompt,
      verification_prompt: verificationPrompt,
      regeneration_prompt: regenerationPrompt
    };
  }

  private static buildMainPrompt(contract: MessageContract, userInputs: Record<string, string>): string {
    const { speaker, claim, audience, benefit, proof, constraints } = contract;
    
    // Replace template variables in dynamic content
    const processedClaim = this.replaceVariables(claim.headline, userInputs);
    const processedBenefits = benefit.outcome.map(b => this.replaceVariables(b, userInputs));

    return `# あなたの役割
${speaker.role}として、${speaker.brand}の専門知識を活かした記事を書く。
信頼性の根拠: ${speaker.credibility.join('、')}

# 目的（KPI付き）
「${processedClaim}」という主張を通じて、読者に具体的価値を提供する。
成功基準: 読者の課題解決、CTAへの自然な誘導、専門性の印象付け
非目的: 誇大広告、根拠のない主張、競合批判

# 対象読者
${audience.persona}
解決したい課題: ${audience.jobs_to_be_done.join('、')}
想定される不安: ${audience.objections.join('、')}
知識レベル: ${audience.knowledge_level}/5

# 前提条件
- 主張の独自性: ${claim.uniqueness}
- 補強ポイント: ${claim.subpoints.join('、')}
- 根拠タイプ: ${proof.evidence_type}
- 証拠の出典: ${proof.sources.join('、')}
- 具体的指標: ${proof.metrics.join('、')}

# 制約条件
- 文字数: ${constraints.min_chars}〜${constraints.max_chars}字
- トーン設定:
  - フォーマル度: ${constraints.tone.formality}/5
  - 熱量: ${constraints.tone.energy}/5
  - 専門性: ${constraints.tone.expertise}/5
  - 比喩度: ${constraints.tone.metaphor}/5
- 禁止語: ${constraints.banned_words.join('、')}
- 必須要素: ${constraints.required_elements.join('、')}

# 構成（必須）
1. 導入: 読者の課題を明確化し、この記事で得られる価値を先出し
2. 要点整理: ${claim.subpoints.length}つのポイントを見出し付きで
3. 本論: 各ポイントの詳細（手順、テンプレート、事例を含む）
4. よくある質問: ${audience.objections.length}つの不安に対する回答
5. まとめ: 要点の再整理と次のアクション提示
6. CTA: ${constraints.cta_copy}

# 提供価値（明示必須）
読者が得る具体的成果:
${processedBenefits.map((b, i) => `- ${b}`).join('\n')}

感情的価値: ${benefit.emotional.join('、')}
機能的価値: ${benefit.functional.join('、')}
社会的価値: ${benefit.social.join('、')}

# 例示
Good例: 主張→根拠→ベネフィット→CTAが一筆書きで繋がり、読者の不安が解消される
Bad例: 主観のみ、根拠不明、ベネフィットが抽象的、CTAが唐突

# 出力形式
純Markdownのみ。H2/H3見出し、箇条書き、太字を適切に使用。
最後に「関連記事案」を3つ箇条書きで提案。

# +1 魔法要素（限定）
記事の最後に読者が「なるほど！」と前向きになる一言を追加。専門性を保ちつつ親近感を演出。

# 変数の値
${Object.entries(userInputs).map(([key, value]) => `${key}: ${value}`).join('\n')}`;
  }

  private static buildVerificationPrompt(contract: MessageContract): string {
    return `あなたは厳格な編集デスクです。以下のMarkdown記事が message contract の要件を満たしているかを検証してください。

# 検証項目（8項目）
1. 発信者明確性: ${contract.speaker.role}（${contract.speaker.brand}）として語っているか
2. 主張明確性: 「${contract.claim.headline}」が明確に述べられているか  
3. ターゲット明確性: ${contract.audience.persona}に向けて書かれているか
4. ベネフィット具体性: ${contract.benefit.outcome.join('、')}が具体的に示されているか
5. 根拠充実性: ${contract.proof.evidence_type}による証拠が含まれているか
6. CTA自然性: ${contract.constraints.cta_copy}への導線が自然か
7. 制約遵守: 文字数${contract.constraints.min_chars}-${contract.constraints.max_chars}字、禁止語なし
8. 独自性: ${contract.claim.uniqueness}が表現されているか

# 出力形式（JSON必須）
{
  "score": 0-100,
  "checks": {
    "speaker_clear": true/false,
    "claim_clear": true/false,
    "audience_targeted": true/false,
    "benefit_concrete": true/false,
    "proof_included": true/false,
    "cta_natural": true/false,
    "constraints_met": true/false,
    "uniqueness_present": true/false
  },
  "reasons": ["不足・逸脱の具体的理由..."],
  "needs_regeneration": true/false,
  "fix_brief": "修正すべき点の短い指示（50-120字）"
}`;
  }

  private static buildRegenerationPrompt(contract: MessageContract): string {
    return `前回の記事で不足していた点を補強して再生成してください。

# 修正指示
{{FIX_BRIEF}}

# 元の要件（変更なし）
- 発信者: ${contract.speaker.role}（${contract.speaker.brand}）
- 主張: ${contract.claim.headline}
- 対象: ${contract.audience.persona}
- ベネフィット: ${contract.benefit.outcome.join('、')}

# 出力形式
修正版のMarkdown記事のみ。`;
  }

  private static replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }

  /**
   * Extract required input variables from contract templates
   */
  static extractRequiredInputs(contract: MessageContract): string[] {
    const templates = [
      contract.claim.headline,
      ...contract.claim.subpoints,
      ...contract.benefit.outcome,
      ...contract.proof.sources,
    ];

    const variableSet = new Set<string>();
    templates.forEach(template => {
      const matches = template.match(/\{\{(\w+)\}\}/g);
      if (matches) {
        matches.forEach(match => {
          const variable = match.replace(/\{\{|\}\}/g, '');
          variableSet.add(variable);
        });
      }
    });

    return Array.from(variableSet);
  }

  /**
   * Validate that all required inputs are provided
   */
  static validateInputs(contract: MessageContract, userInputs: Record<string, string>): {
    valid: boolean;
    missing: string[];
  } {
    const required = this.extractRequiredInputs(contract);
    const provided = Object.keys(userInputs);
    const missing = required.filter(req => !provided.includes(req));

    return {
      valid: missing.length === 0,
      missing
    };
  }
}