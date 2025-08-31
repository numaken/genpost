# WordPress Auto Generator System

## 概要
`main.py` をエントリポイントとした、OpenAI × WordPress REST API連携による自動記事生成システムです。  
記事ジャンル（技術スタック）やプロンプトパックを柔軟に選択でき、重複チェックや下書き一括公開、タグ管理などの上位機能も備えています。

---

## 主な特徴
- **多彩なジャンル**：`wordpress`、`javascript`、`python`、`react`、`vue`、`sql`、`cooking`、`travel` など  
- **プロンプトパック切り替え**：デフォルト以外に `cooking`、`travel` 等を利用可能  
- **エディション制御**：`entry`（無料版）／`standard`／`pro` 各エディションごとに機能制限  
- **重複チェック**：過去記事の重複を回避  
- **一括公開・タグ管理**：Standard版以上でサポート  
- **メンテナンス用スクリプト**：全記事削除、ステータス変更、スクリプト一括リファクタなど  

---

## 動作環境
- Python 3.8 以上  
- WordPress 5.x 以上  
- `.env` による設定（`.env.sample` を参照）  

---

## インストール手順

1. リポジトリをクローン  
   ```bash
   git clone https://github.com/numaken/wordpress-auto-generator.git
   cd wordpress-auto-generator-phase3
   ```

2. 依存ライブラリをインストール  
   ```bash
   pip install -r requirements.txt
   ```

3. 環境変数ファイルを作成・編集  
   ```bash
   cp .env.sample .env
   # → .env に WordPress URL、ユーザー、アプリパスワード、APIキー 等を設定
   ```

---

## 設定項目（`.env`）

```dotenv
# エディション設定
EDITION=entry            # entry, standard, pro

# WordPress 設定（必須）
WP_SITE_URL=…            # e.g. https://your-site.com
WP_USER=…                # 投稿用ユーザー名
WP_APP_PASS=…            # WordPress アプリパスワード
CATEGORY_ID=2            # 投稿カテゴリID

# OpenAI 設定（必須）
OPENAI_API_KEY=sk-….

# 生成設定
POST_STATUS=draft        # draft or publish
NEW_COUNT=5              # デフォルト生成件数
MONTHLY_LIMIT=50         # 月間生成上限

# ログ設定
LOG_LEVEL=INFO           # INFO, DEBUG, WARN など
```

---

## 使い方

### ヘルプ表示
```bash
python3 main.py --help
```

### エディション情報表示
```bash
python3 main.py --info
```

### プロンプトパック一覧表示
```bash
python3 main.py --list-prompts
```

### 記事生成例
- WordPress 記事を3件生成（下書き）
  ```bash
  python3 main.py --tech wordpress --count 3
  ```
- JavaScript＋Travelプロンプトで2件生成＆公開
  ```bash
  python3 main.py --tech javascript --prompt-pack travel --count 2 --bulk-publish
  ```
- 複数技術スタック記事を1件生成（Standard以上）
  ```bash
  python3 main.py --multi-tech --count 1
  ```

---

### コマンドラインオプション一覧

| オプション                         | 説明                                                             |
|------------------------------------|------------------------------------------------------------------|
| `-h, --help`                       | ヘルプを表示                                                    |
| `--info`                           | エディション情報と使用可能な機能を表示                         |
| `--list-prompts`                   | 利用可能なプロンプトパック一覧を表示                           |
| `--tech {wordpress,javascript,…}`  | 記事生成する技術スタックまたはジャンルを指定                    |
| `--prompt-pack PROMPT_PACK`        | 使用するプロンプトパック（default, cooking, travel など）        |
| `--count COUNT`                    | 生成する記事数 (デフォルト: 1)                                   |
| `--multi-tech`                     | マルチ技術記事生成 (Standard版以上)                              |
| `--bulk-publish`                   | 下書き記事の一括公開 (Standard版以上)                            |
| `--manage-tags`                    | タグ管理機能 (Pro版のみ)                                         |

---

## ディレクトリ構成

```
wordpress-auto-generator-phase3/
├── .env*
├── .env.sample
├── requirements.txt
├── main.py
├── fix_imports.py
├── usage_entry.json
├── index.html
├── secure_service_model.md
├── archive/                  # メンテナンススクリプト群
│   ├── delete_all_posts.py
│   ├── fix_post_status.py
│   └── refactor_all_scripts.py
├── core/
│   └── wrapper.py            # OpenAI & WP API 呼び出しラッパー
├── modules/                  # 各技術スタック別生成ロジック
│   ├── wordpress/
│   ├── javascript/
│   ├── python/
│   ├── react/
│   ├── vue/
│   └── tools/
├── prompts/                  # プロンプト定義ファイル群
├── editions/                 # エディションごとの機能定義
└── docs/                     # ドキュメント（拡張）
```

---

## 各ファイル・ディレクトリ詳細

- **main.py**  
  CLIエントリポイント。引数解析 → 環境変数読み込み → 生成モジュール呼び出し → 重複チェック → WP投稿 の一連処理を実行。

- **fix_imports.py**  
  モジュールのインポートパスを一括修正するユーティリティ。

- **core/wrapper.py**  
  OpenAI API や WordPress REST API の呼び出しを共通化。

- **modules/**  
  ジャンル別の生成ロジックを格納。  
  例：`modules/wordpress/generate.py` → WordPress記事特化プロンプト処理。

- **prompts/**  
  各プロンプトパック（デフォルト、cooking、travel など）の JSON/TXT ファイル。

- **editions/**  
  `entry`／`standard`／`pro` 各版の機能制限を定義。

- **archive/**  
  全記事削除やステータス一括変更など、運用時のバッチタスク。

- **usage_entry.json**  
  実行履歴や利用状況をローカルにトラッキング。

- **index.html, secure_service_model.md**  
  静的ドキュメントやサービスモデル設計資料。

---

## 貢献・開発フロー
1. リポジトリをFork → ブランチ作成  
2. コード修正・新機能追加  
3. テスト＆動作確認  
4. Pull Request & レビュー

---

## ライセンス
MIT License （各自プロジェクトに合わせて変更してください）
