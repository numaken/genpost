# WordPress記事自動生成システム

🚀 **月50記事を5分で生成** - WordPressブログ運営を完全自動化

## ✨ 特徴

- 🤖 **AI記事自動生成**: OpenAI GPT-3.5で高品質記事を生成
- 📝 **14種類のプロンプトパック**: 料理・技術・旅行・副業など豊富なジャンル
- 🛡️ **安全設計**: 下書き保存、1日制限、投稿間隔制御
- ⚡ **簡単セットアップ**: ワンクリックインストール

## 🎯 こんな方におすすめ

- WordPressブログを運営している
- 記事執筆に時間がかかりすぎる
- ネタ切れに悩んでいる
- 外注費を削減したい

## 🚀 セットアップ手順

### 1. システムセットアップ
```bash
./setup.sh
```

### 2. WordPress設定
`.env` ファイルを編集して以下を設定:

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxx
WP_SITE_URL=https://your-site.com
WP_USER=your_username
WP_APP_PASS=xxxx xxxx xxxx xxxx
```

### 3. WordPressアプリケーションパスワード作成
1. WordPress管理画面 → ユーザー → プロフィール
2. 「新しいアプリケーションパスワード」で作成
3. 生成されたパスワードを `.env` の `WP_APP_PASS` に設定

## 💻 使い方

### システム情報確認
```bash
source wp_env/bin/activate
python main.py --info
```

### 記事生成実行
```bash
# 3記事生成
python main.py --tech wordpress --count 3
```

## 🛡️ 安全機能

- ✅ **下書き保存**: 記事は下書き状態で保存されます
- ✅ **1日制限**: デフォルト10記事/日まで（変更可能）
- ✅ **投稿間隔**: 30秒間隔でサーバー負荷軽減
- ✅ **月間制限**: エディション別使用量制限

## 📦 利用可能プロンプトパック

### 料理・レシピ系 (6パック)
- `cooking:lunch` - お昼ご飯レシピ
- `cooking:dinner` - 夜ご飯レシピ
- `cooking:breakfast` - 朝ご飯レシピ
- `cooking:dessert` - デザートレシピ
- `cooking:snack` - おやつレシピ
- `cooking:healthy` - ヘルシーレシピ

### 技術系 (4パック)
- `tech:wordpress` - WordPress技術記事
- `tech:frontend` - フロントエンド技術
- `tech:backend` - バックエンド技術
- `tech:tools` - 開発ツール記事

### 旅行系 (2パック)
- `travel:domestic` - 国内旅行記事
- `travel:international` - 海外旅行記事

### 副業・ビジネス系 (2パック)
- `sidebiz:online` - オンライン副業
- `sidebiz:affiliate` - アフィリエイト記事

## 🎛️ 設定項目

| 設定項目 | 説明 | デフォルト |
|---------|------|-----------|
| `DAILY_LIMIT` | 1日最大生成数 | 10 |
| `POST_STATUS` | 投稿ステータス | draft |
| `SAFETY_INTERVAL` | 投稿間隔（秒） | 30 |
| `CATEGORY_ID` | WordPress投稿カテゴリ | 1 |

## 🔧 トラブルシューティング

### よくある問題

**Q: `python: command not found`**
A: `python3 main.py` で実行してください

**Q: OpenAI APIエラー**
A: `.env` の `OPENAI_API_KEY` を確認してください

**Q: WordPress投稿失敗** 
A: アプリケーションパスワードと権限を確認してください

### ログ確認
実行中のログで詳細なエラー情報を確認できます。

## 📞 サポート

セットアップでご不明な点がございましたら、お気軽にお声がけください。

---

© 2024 WordPress記事自動生成システム