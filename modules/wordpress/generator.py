#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WordPressGenerator - 新パイプライン対応版（改良版）
prompts/packs 以下の小カテゴリを受け取り、ChatCompletion → 投稿まで行う
"""

import logging
import openai
import time
from core.config import config
from core.prompt_builder import build_messages
from core.wrapper import ArticleGeneratorWrapper

class WordPressGenerator:
    """
    WordPress 記事生成アダプター（新パイプライン対応）
    生成→投稿 まで一手に引き受けます
    """
    def __init__(self, prompt_pack=None):
        openai.api_key = config.openai_api_key
        self.packs = prompt_pack or []
        self.wrapper = ArticleGeneratorWrapper()

    def generate_article(self) -> bool:
        try:
            logging.info(f"🔧 build_messages からプロンプトを組み立て（packs={self.packs}）")
            
            # packsが空の場合はデフォルトメッセージを作成
            if not self.packs:
                messages = [
                    {"role": "system", "content": "あなたは優秀なWordPress記事作成者です。日本語で技術的で有用な記事を書いてください。"},
                    {"role": "user", "content": "WordPressの基本的な使い方について、初心者にもわかりやすい記事を書いてください。タイトル、見出し、内容を含む完全な記事を作成してください。"}
                ]
                logging.info("🔧 デフォルトメッセージを使用")
            else:
                messages = build_messages(self.packs)
            
            # messagesが空でないことを確認
            if not messages:
                messages = [
                    {"role": "system", "content": "あなたは優秀な記事作成者です。"},
                    {"role": "user", "content": "有用な記事を書いてください。"}
                ]
                logging.info("🔧 フォールバックメッセージを使用")

            logging.info(f"🔧 メッセージ数: {len(messages)}")
            logging.info("🤖 OpenAI API 呼び出し: ChatCompletion.create()")
            
            response = openai.ChatCompletion.create(
                model=config.openai_model,
                messages=messages,
                temperature=0.7,
                max_tokens=1200
            )
            article_text = response.choices[0].message.content.strip()
            logging.info(f"✅ OpenAI から記事テキスト取得: {len(article_text)}文字")

            # 🛡️ 安全機能: 投稿間隔制御（API制限・サーバー負荷対策）
            logging.info("⏰ 安全な投稿間隔を確保中... (30秒待機)")
            time.sleep(30)
            
            success = self.wrapper.post_article(article_text)
            if success:
                logging.info("✅ 記事 1 件の投稿が完了しました（下書き状態）")
                logging.info("📝 ※ WordPress管理画面で内容確認後に公開してください")
            else:
                logging.error("❌ 記事の投稿に失敗しました")
            return success

        except Exception as e:
            logging.error(f"❌ WordPressGenerator エラー: {e}")
            return False
