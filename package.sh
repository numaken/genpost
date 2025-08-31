#!/bin/bash
# 販売用パッケージ作成スクリプト

VERSION="v1.0-commercial"
PACKAGE_NAME="wordpress-auto-generator-commercial-${VERSION}"

echo "📦 販売用パッケージ作成開始: ${PACKAGE_NAME}"
echo "============================================================"

# 一時ディレクトリ作成
mkdir -p /tmp/${PACKAGE_NAME}
PACKAGE_DIR="/tmp/${PACKAGE_NAME}"

# 必要ファイルをコピー
echo "📋 必要ファイルをコピー中..."

# システムファイル
cp -r core/ ${PACKAGE_DIR}/
cp -r modules/ ${PACKAGE_DIR}/
cp -r prompts/ ${PACKAGE_DIR}/
cp main.py ${PACKAGE_DIR}/
cp requirements.txt ${PACKAGE_DIR}/
cp setup.sh ${PACKAGE_DIR}/
cp README_USER.md ${PACKAGE_DIR}/README.md

# 設定ファイル（サンプル版）
cat > ${PACKAGE_DIR}/.env.sample << 'EOF'
# WordPress記事自動生成システム 設定ファイル
# このファイルを .env にコピーして設定値を変更してください

# エディション設定
EDITION=entry
NEW_COUNT=3
MONTHLY_LIMIT=50
DAILY_LIMIT=10

# WordPress設定（必須 - 変更してください）
OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE
OPENAI_MODEL=gpt-3.5-turbo
WP_SITE_URL=https://your-wordpress-site.com
WP_USER=your_username
WP_APP_PASS=your_app_password_here
CATEGORY_ID=1
POST_STATUS=draft
SAFETY_INTERVAL=30
EOF

# ライセンスファイル作成
cat > ${PACKAGE_DIR}/LICENSE.txt << 'EOF'
WordPress記事自動生成システム 商用ライセンス

購入者は以下の権利を有します：
1. 本システムを無制限に使用する権利
2. 生成された記事を自由に使用・編集・公開する権利
3. 永続的なアップデート提供

制限事項：
1. 本システムの再配布・転売は禁止
2. ソースコードの改変は自己責任
3. APIキーは購入者自身で準備

免責事項：
- 生成された記事の品質・正確性は保証されません
- APIコスト・WordPress運用費用は購入者負担
- システム使用による損害は一切責任を負いません

Copyright 2024. All rights reserved.
EOF

# セットアップガイド作成
cat > ${PACKAGE_DIR}/SETUP_GUIDE.md << 'EOF'
# セットアップガイド

## 🎯 5分で完了！簡単セットアップ

### ステップ1: セットアップ実行
```bash
./setup.sh
```

### ステップ2: WordPress設定
1. `.env.sample` を `.env` にコピー
2. 以下の項目を設定:

```
OPENAI_API_KEY=sk-proj-xxxxxxxxxx  ← OpenAIで取得
WP_SITE_URL=https://your-site.com  ← あなたのサイト
WP_USER=admin                      ← WordPressユーザー名
WP_APP_PASS=xxxx xxxx xxxx xxxx    ← アプリケーションパスワード
```

### ステップ3: WordPress準備
1. 管理画面 → ユーザー → プロフィール
2. 「新しいアプリケーションパスワード」作成
3. 生成されたパスワードを `.env` に設定

### ステップ4: 実行テスト
```bash
source wp_env/bin/activate
python main.py --info
python main.py --tech wordpress --count 1
```

## 🔧 OpenAI APIキー取得方法
1. https://platform.openai.com へアクセス
2. アカウント作成/ログイン
3. API Keys → Create new secret key
4. 生成されたキーを `.env` に設定

## ⚠️ 注意点
- 記事は**下書き状態**で保存されます
- 内容確認後、手動で公開してください
- 1日最大10記事まで制限されています（安全機能）

## 💰 コスト目安
- OpenAI API: 約¥3-10/記事
- 月50記事: 約¥150-500/月
EOF

# パッケージ情報ファイル
cat > ${PACKAGE_DIR}/PACKAGE_INFO.json << EOF
{
  "name": "WordPress記事自動生成システム",
  "version": "${VERSION}",
  "description": "AIを使って高品質なWordPress記事を自動生成するシステム",
  "price": "¥19,800",
  "edition": "entry",
  "features": [
    "WordPress記事自動生成",
    "14種類プロンプトパック",
    "安全機能搭載",
    "月50記事まで生成可能",
    "1日制限機能",
    "下書き保存"
  ],
  "requirements": [
    "Python 3.8以上",
    "OpenAI APIキー",
    "WordPressサイト",
    "アプリケーションパスワード"
  ],
  "support": "セットアップサポート付き"
}
EOF

# ZIPパッケージ作成
echo "🗜️ ZIPパッケージ作成中..."
cd /tmp
zip -r ${PACKAGE_NAME}.zip ${PACKAGE_NAME}/
mv ${PACKAGE_NAME}.zip ~/Desktop/

echo ""
echo "🎉 パッケージ作成完了！"
echo "============================================================"
echo "📦 パッケージ: ~/Desktop/${PACKAGE_NAME}.zip"
echo "💰 販売価格: ¥19,800"
echo "🛒 販売準備完了！"
echo "============================================================"