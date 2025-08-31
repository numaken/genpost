#!/bin/bash
# WordPress記事自動生成システム セットアップスクリプト v1.0

echo "🚀 WordPress記事自動生成システム セットアップ開始"
echo "============================================================"

# Python3 確認
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 がインストールされていません"
    echo "   https://python.org からダウンロードしてください"
    exit 1
fi
echo "✅ Python3 確認完了"

# 仮想環境作成
echo "🔧 Python仮想環境を作成中..."
python3 -m venv wp_env
source wp_env/bin/activate

# 依存関係インストール
echo "📦 必要なライブラリをインストール中..."
pip install --upgrade pip
pip install -r requirements.txt

# .env サンプルコピー
if [ ! -f .env ]; then
    echo "⚙️ 設定ファイル(.env)を作成中..."
    cat > .env << 'EOF'
# エントリー版設定（月額12,800円）
EDITION=entry
NEW_COUNT=3
MONTHLY_LIMIT=50
DAILY_LIMIT=10

# WordPress設定（要変更）
OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE
OPENAI_MODEL=gpt-3.5-turbo
WP_SITE_URL=https://your-site.com
WP_USER=your_username
WP_APP_PASS=your_app_password
CATEGORY_ID=1
POST_STATUS=draft
SAFETY_INTERVAL=30
EOF
    echo "✅ .env ファイルを作成しました"
else
    echo "⚠️  .env ファイルは既に存在します"
fi

echo ""
echo "🎉 セットアップ完了！"
echo "============================================================"
echo ""
echo "📋 次のステップ:"
echo "1. .env ファイルを編集してWordPress接続情報を設定"
echo "   - OPENAI_API_KEY: OpenAIのAPIキー"
echo "   - WP_SITE_URL: あなたのWordPressサイトURL"
echo "   - WP_USER: WordPressユーザー名"
echo "   - WP_APP_PASS: WordPressアプリケーションパスワード"
echo ""
echo "2. WordPress管理画面でアプリケーションパスワードを作成"
echo "   ユーザー → プロフィール → アプリケーションパスワード"
echo ""
echo "3. システム実行"
echo "   source wp_env/bin/activate"
echo "   python main.py --info"
echo "   python main.py --tech wordpress --count 3"
echo ""
echo "🛡️  安全機能:"
echo "   - 投稿は下書き状態で保存されます"
echo "   - 1日最大10記事まで制限"
echo "   - 30秒間隔で投稿（サーバー負荷対策）"
echo ""
echo "📞 サポートが必要な場合はお気軽にお声がけください"
echo "============================================================"