/**
 * Generation Engine - 契約→生成→検証→再生成エンジン
 */

import OpenAI from 'openai';
import { MessageContract, CriticResult, contractToPrompt } from './message-contract';

export class GenerationEngine {
  private openai: OpenAI;
  
  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }
  
  /**
   * メイン実行：契約→生成→検証→(必要なら再生成)
   */
  async execute(
    contract: MessageContract, 
    existingTitles: string[] = []
  ): Promise<{
    markdown: string;
    verdict: CriticResult;
    regenerated: boolean;
  }> {
    // Step 1: 初回生成
    const initialArticle = await this.generateArticle(contract);
    
    // Step 2: 自己点検
    const verdict = await this.critic(contract, initialArticle, existingTitles);
    
    // Step 3: 必要なら再生成（1回のみ）
    if (verdict.needs_regeneration && verdict.fix_brief) {
      const improvedContract = {
        ...contract,
        _fix_instruction: verdict.fix_brief
      };
      const regeneratedArticle = await this.generateArticle(improvedContract);
      
      // 再検証
      const finalVerdict = await this.critic(contract, regeneratedArticle, existingTitles);
      
      return {
        markdown: regeneratedArticle,
        verdict: finalVerdict,
        regenerated: true
      };
    }
    
    return {
      markdown: initialArticle,
      verdict,
      regenerated: false
    };
  }
  
  /**
   * 記事生成（8+1の公式）
   */
  private async generateArticle(contract: MessageContract & { _fix_instruction?: string }): Promise<string> {
    const systemPrompt = `
あなたは業界特化の編集ライターです。
読者の実務を前進させる実用的な記事を書いてください。
出力はMarkdown形式のみ。メタ的な説明は不要。
`;
    
    let userPrompt = contractToPrompt(contract);
    
    // 修正指示がある場合は追加
    if ('_fix_instruction' in contract && contract._fix_instruction) {
      userPrompt += `\n\n【重要な修正指示】\n${contract._fix_instruction}`;
    }
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.6,
      max_tokens: 3000,
    });
    
    return response.choices[0].message.content?.trim() || '';
  }
  
  /**
   * 自己点検（Critic）
   */
  private async critic(
    contract: MessageContract,
    articleMd: string,
    existingTitles: string[] = []
  ): Promise<CriticResult> {
    const systemPrompt = `
あなたは厳密な編集デスクです。
記事が契約条件を満たしているかを検証し、結果をJSON形式で返してください。
`;
    
    const userPrompt = `
以下の記事が、メッセージ契約の条件を満たしているか検証してください。

## メッセージ契約
${JSON.stringify(contract, null, 2)}

## 生成された記事
${articleMd}

## 既存記事タイトル
${existingTitles.join('\n')}

## チェック項目
1. speaker_clear: 誰が言っているか明確か
2. claim_clear: 何を主張しているか明確か
3. audience_clear: 誰に向けているか明確か
4. benefit_concrete: どんな得が具体的に示されているか
5. proof_exists: 根拠・証拠があるか
6. cta_natural: CTAが自然に接続されているか
7. constraints_met: 制約（文字数、禁止語、トーン）が守られているか
8. non_duplicate: 既存記事と重複していないか

## 出力形式（JSONのみ）
{
  "score": 0-100の総合スコア,
  "checks": {
    "speaker_clear": true/false,
    "claim_clear": true/false,
    "audience_clear": true/false,
    "benefit_concrete": true/false,
    "proof_exists": true/false,
    "cta_natural": true/false,
    "constraints_met": true/false,
    "non_duplicate": true/false
  },
  "reasons": ["不足や逸脱の理由"],
  "needs_regeneration": true/false,
  "fix_brief": "再生成が必要な場合の修正指示（50-120字）"
}
`;
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });
    
    try {
      const content = response.choices[0].message.content || '{}';
      return JSON.parse(content) as CriticResult;
    } catch (e) {
      // パースエラー時のフォールバック
      return {
        score: 0,
        checks: {
          speaker_clear: false,
          claim_clear: false,
          audience_clear: false,
          benefit_concrete: false,
          proof_exists: false,
          cta_natural: false,
          constraints_met: false,
          non_duplicate: false
        },
        reasons: ['JSON解析エラー'],
        needs_regeneration: true,
        fix_brief: '記事全体を見直して、契約条件を満たすように修正'
      };
    }
  }
  
  /**
   * 複数記事の一括生成（重複チェック付き）
   */
  async generateBatch(
    contracts: MessageContract[],
    options: {
      maxRetries?: number;
      minScore?: number;
    } = {}
  ): Promise<Array<{
    contract: MessageContract;
    result: {
      markdown: string;
      verdict: CriticResult;
      regenerated: boolean;
    };
  }>> {
    const { minScore = 70 } = options;
    const results = [];
    const generatedTitles: string[] = [];
    
    for (const contract of contracts) {
      let result = await this.execute(contract, generatedTitles);
      
      // スコアが低すぎる場合は契約を調整して再試行
      if (result.verdict.score < minScore) {
        console.warn(`記事スコアが低い (${result.verdict.score}): ${contract.claim.headline}`);
        // ここで契約の自動調整ロジックを入れることも可能
      }
      
      results.push({ contract, result });
      
      // タイトル抽出して重複チェックリストに追加
      const titleMatch = result.markdown.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        generatedTitles.push(titleMatch[1]);
      }
    }
    
    return results;
  }
}