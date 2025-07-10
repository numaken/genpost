#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import requests
import json
import time
import sys
import html
import logging

# 設定を外部ファイルから読み込み
try:
    from core.config import config
except ImportError:
    logging.error("❌ config.py が見つかりません")
    sys.exit(1)

# 重複チェックモジュールをインポート
try:
    from core.duplicate_checker import check_single_topic, filter_duplicate_topics
except ImportError:
    logging.error("❌ duplicate_checker.py が見つかりません")
    sys.exit(1)

# 単一トピック処理用
SINGLE_TOPIC = os.getenv('SINGLE_TOPIC')
CATEGORY_ID = int(os.getenv('PYTHON_CATEGORY_ID', 7))  # Python用カテゴリ

#――――――――――――――――――――――
# Python デフォルトトピック一覧
#――――――――――――――――――――――
default_topics = [
    "FastAPI でREST APIを構築する基本パターン",
    "Pandas で大量データを効率的に処理する方法",
    "Django ORM でN+1問題を回避するクエリ最適化",
    "Pythonでスクレイピング：BeautifulSoupとSelenium使い分け",
    "pytest を使った効果的なテスト駆動開発",
    # 2025年版の新しいトピック
    "Python 3.12+ の新機能と型ヒント活用法",
    "Pydantic v2 でデータバリデーションとシリアライゼーション",
    "FastAPI + SQLAlchemy 2.0 で非同期データベース操作",
    "Poetry を使った Python プロジェクト依存関係管理",
    "Streamlit でデータサイエンス Web アプリを構築する方法",
    "Celery + Redis で非同期タスク処理システム構築",
    "Python multiprocessing で CPU集約的処理の並列化",
]

def md2html(md: str) -> str:
    """
    Markdown → HTML 変換関数（Python用にコードブロックを調整）
    """
    html_lines = []
    lines = md.split('\n')
    in_code = False
    in_list = False

    for line in lines:
        # コードブロック開始（Python用）
        if line.startswith("```python") or line.startswith("```py"):
            language = line.replace("```", "").strip()
            html_lines.append(f'<pre class="language-{language} line-numbers"><code class="language-{language}">')
            in_code = True
            continue
        # コードブロック終了
        if in_code and line.strip() == "```":
            html_lines.append('</code></pre>')
            in_code = False
            continue
        # コード内部
        if in_code:
            html_lines.append(html.escape(line))
            continue

        # 見出し
        if line.startswith("### "):
            html_lines.append(f'<h3>{html.escape(line[4:].strip())}</h3>')
            continue
        if line.startswith("## "):
            html_lines.append(f'<h2>{html.escape(line[3:].strip())}</h2>')
            continue
        if line.startswith("# "):
            html_lines.append(f'<h1>{html.escape(line[2:].strip())}</h1>')
            continue

        # リスト項目
        if line.strip().startswith("- "):
            if not in_list:
                html_lines.append('<ul>')
                in_list = True
            html_lines.append(f'<li>{html.escape(line.strip()[2:].strip())}</li>')
            continue
        # リスト終了
        if in_list:
            html_lines.append('</ul>')
            in_list = False

        # 空行
        if not line.strip():
            html_lines.append('<p></p>')
            continue

        # 通常テキスト
        html_lines.append(f'<p>{html.escape(line)}</p>')

    # リストが閉じていなければ閉じる
    if in_list:
        html_lines.append('</ul>')

    return "\n".join(html_lines)

def generate_python_article_content(topic: str) -> str:
    """
    Python記事専用のコンテンツ生成
    """
    system_content = "あなたはPython エンジニア向けの技術記事作成アシスタントです。Django、FastAPI、データサイエンス分野の知識を活用して実践的な記事を作成してください。"
    
    user_content = f"""
以下のフォーマットで日本語のPython技術記事を生成してください。
トピック: {topic}

---
# 概要
- この技術の用途と重要性
- 解決する問題や課題
- 前提知識・必要ライブラリ

## 環境構築
```python
# 必要ライブラリのインストール
pip install package_name
```

## 実装コード
```python
# 実践的なPythonコードを記載
# 適切なコメントと型ヒントを含める
from typing import List, Dict
import asyncio

def example_function(data: List[Dict]) -> Dict:
    \"\"\"関数の説明\"\"\"
    pass
```

## 使用例
```python
# より実用的な使用例
# 実際のユースケースを想定
```

## テストコード
```python
# pytest を使ったテストコード例
import pytest

def test_example():
    assert True
```

## 応用・カスタマイズ
- より高度な使用方法
- パフォーマンス最適化
- エラーハンドリング

## 関連技術
- 関連ライブラリ・フレームワーク
- 学習リソース
---

実際に動作する具体的なコードと詳しい解説を含めて記事を生成してください。
最新のPython 3.12+ とベストプラクティスを反映してください。
"""

    payload = {
        "model": "gpt-3.5-turbo",
        "messages": [
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_content}
        ],
        "max_tokens": 3000,  # Python記事は詳細に
        "temperature": 0.7
    }

    try:
        res = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=config.get_openai_headers(),
            json=payload,
            timeout=60
        )

        logging.info(f"OpenAI API HTTPステータス: {res.status_code}")

        if res.status_code != 200:
            logging.error(f"OpenAI API エラー ({res.status_code}): {res.text}")
            return None

        data = res.json()
        
        if "choices" not in data:
            logging.error("API レスポンスに choices が含まれていません")
            return None

        raw_content = data["choices"][0]["message"]["content"].strip()
        return raw_content
        
    except Exception as e:
        logging.error(f"OpenAI API エラー: {e}")
        return None

def get_or_create_tag_id(tag_name: str) -> int:
    """
    タグ名からタグIDを取得、存在しなければ作成
    """
    try:
        # 既存タグを検索
        response = requests.get(
            f"{config.wp_site_url}/wp-json/wp/v2/tags",
            headers=config.get_auth_header(),
            params={"search": tag_name},
            timeout=30
        )
        
        if response.status_code == 200:
            tags = response.json()
            for tag in tags:
                if tag["name"] == tag_name:
                    logging.debug(f"既存タグ見つかりました: {tag_name} (ID: {tag['id']})")
                    return tag["id"]
        
        # タグが存在しない場合は作成
        logging.info(f"新しいタグを作成中: {tag_name}")
        create_response = requests.post(
            f"{config.wp_site_url}/wp-json/wp/v2/tags",
            headers=config.get_auth_header(),
            json={"name": tag_name},
            timeout=30
        )
        
        if create_response.status_code in (200, 201):
            new_tag = create_response.json()
            logging.info(f"✅ タグ作成成功: {tag_name} (ID: {new_tag['id']})")
            return new_tag["id"]
        else:
            logging.error(f"❌ タグ作成失敗: {tag_name} - ステータス: {create_response.status_code}")
            logging.error(f"レスポンス: {create_response.text}")
        
    except Exception as e:
        logging.error(f"❌ タグ処理エラー ({tag_name}): {e}")
    
    return None

def get_tag_ids(tag_names: list) -> list:
    """
    タグ名のリストからタグIDのリストを取得
    """
    if not tag_names:
        logging.warning("⚠️  タグ名リストが空です")
        return []
    
    tag_ids = []
    logging.info(f"🏷️  タグID取得開始: {len(tag_names)}個のタグを処理")
    
    for i, tag_name in enumerate(tag_names, 1):
        logging.info(f"🔍 [{i}/{len(tag_names)}] タグ処理中: {tag_name}")
        tag_id = get_or_create_tag_id(tag_name)
        if tag_id:
            tag_ids.append(tag_id)
            logging.info(f"✅ タグID取得成功: {tag_name} → {tag_id}")
        else:
            logging.warning(f"⚠️  タグID取得失敗: {tag_name}")
    
    logging.info(f"🎯 タグID変換完了: {len(tag_names)}個中{len(tag_ids)}個成功")
    return tag_ids

def post_to_wordpress(title: str, content: str, category_id: int, status: str = None) -> bool:
    """
    WordPress REST API 経由でPython記事を投稿
    """
    # タグ名からタグIDを取得
    tag_names = ["Python", "Django", "FastAPI", "データサイエンス"]
    tag_ids = get_tag_ids(tag_names)
    
    post_data = {
        "title": title,
        "content": content,
        "status": status,
        "categories": [category_id],
        "tags": tag_ids,  # 整数のIDを使用
    }
    
    try:
        post_res = requests.post(
            f"{config.wp_site_url}/wp-json/wp/v2/posts",
            headers=config.get_auth_header(),
            data=json.dumps(post_data),
            timeout=30
        )
        
        if post_res.status_code in (200, 201):
            status_text = "下書き保存" if status == "draft" else "公開" if status == "publish" else f"ステータス: {status}"
            logging.info(f"✅ {status_text}成功: {title}")
            return True
        else:
            logging.error(f"❌ 投稿失敗 ({post_res.status_code}):")
            logging.error(post_res.text)
            return False
            
    except Exception as e:
        logging.error(f"❌ WordPress API エラー: {e}")
        return False

def generate_and_post_python(topic: str) -> bool:
    """
    # 🆕 ステータスが指定されていない場合は設定から取得
    if status is None:
        status = config.post_status
    
    # 🆕 ステータスが指定されていない場合は設定から取得
    if status is None:
        status = config.post_status
    
    # 🆕 ステータスが指定されていない場合は設定から取得
    if status is None:
        status = config.post_status
    
    # 🆕 ステータスが指定されていない場合は設定から取得
    if status is None:
        status = config.post_status
    
    # 🆕 ステータスが指定されていない場合は設定から取得
    if status is None:
        status = config.post_status
    
    # 🆕 ステータスが指定されていない場合は設定から取得
    if status is None:
        status = config.post_status
    
    Python記事の生成と投稿
    """
    logging.info(f"▶ Python記事生成開始: {topic}")

    # 1. OpenAI API でPython記事コンテンツを生成
    raw_content = generate_python_article_content(topic)
    if not raw_content:
        logging.error(f"❌ 記事生成失敗: {topic}")
        return False

    # 2. Markdown → HTML 変換
    html_content = md2html(raw_content)

    # 3. WordPressに投稿
    success = post_to_wordpress(topic, html_content, CATEGORY_ID)
    
    if success:
        logging.info(f"✅ 処理完了: {topic}")
    else:
        logging.error(f"❌ 処理失敗: {topic}")
    
    return success

def main():
    logging.info("🎯 Python記事生成スクリプト開始")
    
    # 単一トピック処理（wrapper.pyから呼び出される場合）
    if SINGLE_TOPIC:
        logging.info(f"📝 単一トピック処理: {SINGLE_TOPIC}")
        logging.info(f"📁 カテゴリID: {CATEGORY_ID}")
        
        # 🔍 重複チェック実行
        if not check_single_topic(SINGLE_TOPIC):
            logging.error("❌ 重複により処理をスキップしました")
            sys.exit(1)
        
        success = generate_and_post_python(SINGLE_TOPIC)
        
        if success:
            logging.info("✅ 処理完了: 成功")
            sys.exit(0)
        else:
            logging.error("❌ 処理完了: 失敗")
            sys.exit(1)
    
    # フォールバック処理（単体実行の場合）
    else:
        logging.info("🧪 Python記事生成モード")
        logging.info(f"📊 処理予定: {len(default_topics)}個のトピック")
        
        # 🔍 重複チェック実行
        logging.info("🔍 既存記事との重複チェックを実行中...")
        unique_topics = filter_duplicate_topics(default_topics)
        
        if not unique_topics:
            logging.warning("⚠️  重複チェック後、処理可能なトピックがありません")
            return
        
        if len(unique_topics) < len(default_topics):
            logging.info(f"📋 処理対象を絞り込み: {len(default_topics)} → {len(unique_topics)} 件")
        
        logging.info("=" * 50)
        
        success_count = 0
        failed_count = 0
        
        for i, topic in enumerate(unique_topics):
            logging.info(f"▶ [{i+1}/{len(unique_topics)}] 処理中: {topic}")
            
            if generate_and_post_python(topic):
                success_count += 1
            else:
                failed_count += 1
            
            # 最後の記事以外は待機
            if i < len(unique_topics) - 1:
                logging.info("⏳ 5秒待機中...")
                time.sleep(5)
        
        logging.info("=" * 50)
        logging.info(f"🎉 Python記事生成完了!")
        logging.info(f"✅ 成功: {success_count}件")
        logging.info(f"❌ 失敗: {failed_count}件")
        
        if len(default_topics) > len(unique_topics):
            skipped = len(default_topics) - len(unique_topics)
            logging.info(f"⚠️  重複スキップ: {skipped}件")
        
        logging.info("📝 記事は下書き状態で保存されました。WordPress管理画面で確認してください。")

if __name__ == "__main__":
    main()