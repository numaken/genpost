/**
 * Message Contract - GenPostの中核
 * 「誰が／何を／誰に／どんな得を」を機械可読に定義
 */

export interface MessageContract {
  speaker: {
    role: string;          // "店舗オーナー", "税理士", "不動産業者"
    brand: string;         // "京都361°", "田中会計事務所"
    credibility: string[]; // ["創業10年", "食べログ百名店", "税理士歴20年"]
  };
  
  claim: {
    headline: string;      // "常連化を促す『小皿前菜戦略』で客単価+8〜12%"
    subpoints: string[];   // ["心理学の選択肢設計", "厨房負荷は増やさない段取り"]
  };
  
  audience: {
    persona: string;       // "近隣の20-40代、仕事帰りの単身者"
    jobs_to_be_done: string[]; // ["手早く満足したい", "新しい味の発見"]
    objections: string[];  // ["高そう", "時間がかかるのは嫌"]
  };
  
  benefit: {
    outcome: string[];     // ["満腹感+発見で満足度↑", "会計の驚きなし"]
    proof: string[];       // ["年間来店データ", "アンケート結果", "メニュー原価表"]
  };
  
  cta: {
    type: string;          // "予約/来店", "資料請求", "無料相談"
    copy: string;          // "今日の前菜ラインナップを見る"
  };
  
  constraints: {
    max_chars: number;     // 2200
    tone: {
      formality: number;   // 1-5 (カジュアル→フォーマル)
      energy: number;      // 1-5 (落ち着き→熱量)
      expertise: number;   // 1-5 (初心者向け→専門的)
      metaphor: number;    // 1-5 (直接的→比喩的)
    };
    banned_words: string[]; // ["絶対", "100%保証", "最高"]
  };
}

/**
 * 契約検証ルール
 */
export interface ValidationRule {
  check: keyof ValidationChecks;
  weight: number;
  required: boolean;
}

export interface ValidationChecks {
  speaker_clear: boolean;    // 誰が言っているか明確
  claim_clear: boolean;      // 何を主張しているか明確
  audience_clear: boolean;   // 誰に向けているか明確
  benefit_concrete: boolean; // どんな得が具体的
  proof_exists: boolean;     // 根拠・証拠がある
  cta_natural: boolean;      // CTAが自然に接続
  constraints_met: boolean;  // 制約が守られている
  non_duplicate: boolean;    // 重複テーマでない
}

export interface CriticResult {
  score: number;              // 0-100
  checks: ValidationChecks;
  reasons: string[];          // 不足・逸脱の理由
  needs_regeneration: boolean;
  fix_brief?: string;         // 再生成用の指示
}

/**
 * 契約のデフォルト値
 */
export const DEFAULT_CONTRACT: MessageContract = {
  speaker: {
    role: "",
    brand: "",
    credibility: []
  },
  claim: {
    headline: "",
    subpoints: []
  },
  audience: {
    persona: "",
    jobs_to_be_done: [],
    objections: []
  },
  benefit: {
    outcome: [],
    proof: []
  },
  cta: {
    type: "",
    copy: ""
  },
  constraints: {
    max_chars: 2200,
    tone: {
      formality: 3,
      energy: 3,
      expertise: 3,
      metaphor: 2
    },
    banned_words: ["絶対", "100%保証", "最高", "必ず"]
  }
};

/**
 * 契約の妥当性チェック
 */
export function validateContract(contract: MessageContract): string[] {
  const errors: string[] = [];
  
  // 必須フィールドチェック
  if (!contract.speaker?.role) errors.push("発信者の役割が未設定");
  if (!contract.speaker?.brand) errors.push("ブランド名が未設定");
  if (!contract.claim?.headline) errors.push("主張が未設定");
  if (!contract.audience?.persona) errors.push("ターゲットが未設定");
  if (!contract.benefit?.outcome?.length) errors.push("ベネフィットが未設定");
  if (!contract.cta?.copy) errors.push("CTAが未設定");
  
  // トーン値の範囲チェック
  const tone = contract.constraints?.tone;
  if (tone) {
    Object.entries(tone).forEach(([key, value]) => {
      if (value < 1 || value > 5) {
        errors.push(`トーン${key}は1-5の範囲で設定してください`);
      }
    });
  }
  
  return errors;
}

/**
 * 契約からプロンプトへの変換
 */
export function contractToPrompt(contract: MessageContract): string {
  return `
# あなたの役割
${contract.speaker.role}として、${contract.speaker.brand}の信頼性（${contract.speaker.credibility.join('、')}）を背景に、
${contract.audience.persona}向けの実用的な記事を書いてください。

# 主張
メインメッセージ：${contract.claim.headline}
サポートポイント：
${contract.claim.subpoints.map(p => `- ${p}`).join('\n')}

# ターゲット読者
- ペルソナ：${contract.audience.persona}
- 解決したい課題：${contract.audience.jobs_to_be_done.join('、')}
- 懸念事項：${contract.audience.objections.join('、')}

# 提供する価値
成果：${contract.benefit.outcome.join('、')}
根拠：${contract.benefit.proof.join('、')}

# 行動喚起
${contract.cta.copy}（${contract.cta.type}）

# 制約条件
- 最大文字数：${contract.constraints.max_chars}文字
- トーン：フォーマル度${contract.constraints.tone.formality}/5、熱量${contract.constraints.tone.energy}/5、専門性${contract.constraints.tone.expertise}/5、比喩${contract.constraints.tone.metaphor}/5
- 禁止語：${contract.constraints.banned_words.join('、')}

# 出力形式
Markdown形式で、以下の構造に従って記事を生成：
1. 導入（課題提起）
2. 要点先出し（結論）
3. 本論（具体的な方法・事例・FAQ）
4. まとめ
5. CTA（自然な行動喚起）

専門用語は初出で簡潔に説明。実社名は出さない。
最後に読者が前向きになる一言を添える。
`;
}