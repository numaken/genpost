#!/usr/bin/env bash
set -euo pipefail

# ローカル雛形パック用設定
PROMPTS_DIR="prompts/packs"
TECH_SUBS="wordpress javascript python react vue sql"
COOKING_SUBS="morning lunch dinner"
TRAVEL_SUBS="domestic international"
SIDEBIZ_SUBS="ai-sidebiz affiliate blogging"

read -r -d '' HD_TMPL << 'HEREDOC'
<!--
headings.md
「見出し＆テンプレート」をここに書いてください
-->
HEREDOC

read -r -d '' IN_TMPL << 'HEREDOC'
<!--
instructions.md
「ライティング指示（トーン／構成）」をここに書いてください
-->
HEREDOC

read -r -d '' SM_TMPL << 'HEREDOC'
<!--
samples.md
「具体的な文例・キーワードリスト」をここに書いてください
-->
HEREDOC

# 1) ローカル雛形パック生成
for domain in tech cooking travel sidebiz; do
  case "$domain" in
    tech)    subs=($TECH_SUBS) ;;
    cooking) subs=($COOKING_SUBS) ;;
    travel)  subs=($TRAVEL_SUBS) ;;
    sidebiz) subs=($SIDEBIZ_SUBS) ;;
  esac

  for sub in "${subs[@]}"; do
    DIR="$PROMPTS_DIR/$domain/$sub"
    mkdir -p "$DIR"
    [[ -f "$DIR/headings.md"    ]] || printf "%s\n" "$HD_TMPL" >"$DIR/headings.md"
    [[ -f "$DIR/instructions.md"]] || printf "%s\n" "$IN_TMPL" >"$DIR/instructions.md"
    [[ -f "$DIR/samples.md"     ]] || printf "%s\n" "$SM_TMPL" >"$DIR/samples.md"
  done
done

echo "✅ prompts 配下のディレクトリと雛形ファイルを作成しました"

# 2) リモートパック取得（GitHub Releases から ZIP をダウンロードして展開）
#    以下の環境変数を .env に設定しておいてください:
#      PROMPT_REPO_USER, PROMPT_REPO_NAME

REPO_USER="${PROMPT_REPO_USER:-your_github_user}"
REPO_NAME="${PROMPT_REPO_NAME:-your_repo_name}"
GITHUB_API="https://api.github.com/repos/$REPO_USER/$REPO_NAME/releases/latest"

python3 - << 'PYCODE'
import os, requests, zipfile, io, logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
api_url = os.getenv("GITHUB_API_URL", "")
if not api_url:
    api_url = f"https://api.github.com/repos/{os.getenv('PROMPT_REPO_USER')}/{os.getenv('PROMPT_REPO_NAME')}/releases/latest"

try:
    r = requests.get(api_url, timeout=15)
    r.raise_for_status()
    assets = r.json().get("assets", [])
    if not assets:
        logging.warning("🛑 リモートプロンプトパックが見つかりませんでした")
    else:
        dl_url = assets[0]["browser_download_url"]
        logging.info(f"🔽 ダウンロードURL: {dl_url}")
        z = requests.get(dl_url, timeout=60)
        z.raise_for_status()
        out_dir = Path("prompts/packs")
        out_dir.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(io.BytesIO(z.content)) as zp:
            zp.extractall(out_dir)
        logging.info(f"✅ リモートプロンプトパックを {out_dir} に展開しました")
except Exception as e:
    logging.error(f"❌ リモートパック取得エラー: {e}")
PYCODE

echo "✅ init_prompts.sh 完了"
