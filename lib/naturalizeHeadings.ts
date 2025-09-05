// lib/naturalizeHeadings.ts
export type HeadingMap = Record<string, string>;

// デフォルト置換マップ（必要に応じて編集可能）
export const defaultHeadingMap: HeadingMap = {
  // 基本フレームワーク見出し
  '読者の抱える課題': 'こんな悩み、ありませんか？',
  '解決策と提案': 'アプリでやることはこの3つ',
  '根拠と証拠': '数字でわかる効果',
  'ベネフィット': '導入すると、ここが変わる',
  '感情的フック': 'お客様が"通いたくなる理由"をつくる',
  '行動喚起': 'まずはここから',
  'まとめ': 'まとめ',
  
  // panolabo AI エンジンの8要素対応（重複を避けて別の表現を使用）
  'ターゲット読者': 'こんな方におすすめ',
  '問題・課題': 'よくあるお悩み',
  '解決策・提案': '解決のポイント',
  '根拠・証拠': 'なぜ効果的なのか',
  '感情的フック（Emotion）': '実感できるメリット',
  '行動喚起（Call-to-Action）': '今すぐ始めてみませんか',
  'SEOキーワード配置': 'キーポイント',
  
  // 英語系の見出しにも対応
  'Call-to-Action': '行動のきっかけ',
  'Benefit': 'こんな変化が期待できます',
  'Why': 'その理由とは',
  'How': '具体的な方法',
  'What': 'このような課題はありませんか',
  'Who': 'このような方に最適',
  'Emotion': '心に響くポイント',
  'SEO': '重要なキーワード',
};

const buildPattern = (base: string) =>
  new RegExp(
    '^\\s*' +
      base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + // escape special regex chars
      '\\s*(?:[:：]?\\s*(?:（[^）]*）|\\([^)]*\\)))?\\s*$',
    'i' // case insensitive instead of unicode flag
  );

const slugify = (text: string) =>
  encodeURIComponent(
    text
      .trim()
      .toLowerCase()
      // よくある記号類を間引き（最低限）
      .replace(/[''"]/g, '')
      .replace(/\s+/g, '-')
  );

// Markdown見出しの置換
const transformMarkdown = (md: string, map: HeadingMap) => {
  const entries = Object.entries(map).map(([k, v]) => [buildPattern(k), v] as const);

  return md.replace(/^(#{1,6})\s*(.+)$/gm, (_, sharp: string, text: string) => {
    const clean = text.trim();
    for (const [pat, natural] of entries) {
      if (pat.test(clean)) return `${sharp} ${natural}`;
    }
    return `${sharp} ${text}`;
  });
};

// HTML見出しの置換（単純な<h1-6>に対応）
const transformHtml = (html: string, map: HeadingMap) => {
  const entries = Object.entries(map).map(([k, v]) => [buildPattern(k), v] as const);

  return html.replace(/<(h[1-6])(\s[^>]*)?>([\s\S]*?)<\/\1>/gim, (m, tag, attrs = '', inner) => {
    const plain = inner.replace(/<[^>]+>/g, '').trim(); // 中の装飾は取り除いて判定
    for (const [pat, natural] of entries) {
      if (pat.test(plain)) {
        // id属性があれば素直に差し替え、なければそのまま
        if (attrs) {
          if (/id="[^"]*"/i.test(attrs)) {
            attrs = attrs.replace(/id="[^"]*"/i, `id="${slugify(natural)}"`);
          }
        } else {
          // id属性がない場合は追加
          attrs = ` id="${slugify(natural)}"`;
        }
        return `<${tag}${attrs}>${natural}</${tag}>`;
      }
    }
    return m;
  });
};

export const naturalizeHeadings = (input: string, map: HeadingMap = defaultHeadingMap) => {
  // ざっくり判定：<h2> があればHTML、なければMarkdown優先
  if (/<h[1-6]\b/i.test(input)) {
    return transformHtml(input, map);
  }
  return transformMarkdown(input, map);
};