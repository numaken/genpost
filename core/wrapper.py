#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Article Generator Wrapper - import修正版
記事生成のメインコントローラー（重複チェック機能付き）
"""

import os
import subprocess
import time
import requests
import logging
import json
from core.config import config  # core.config から読み込み

# duplicate_checker からの正しいインポート
try:
    from core.duplicate_checker import (
        fetch_existing_titles,  # 正しい関数名
        get_stats,
        is_duplicate_title,     # 正しい関数名
        filter_duplicate_topics,
        check_single_topic
    )
    
    # 互換性のためのエイリアス関数を定義
    def get_existing_titles():
        """fetch_existing_titles のエイリアス"""
        return fetch_existing_titles()
    
    def check_title_similarity(title, existing_titles):
        """is_duplicate_title の逆の結果を返すエイリアス"""
        return not is_duplicate_title(title, existing_titles)
    
    def save_generated_title(title):
        """タイトル保存（現在は何もしない）"""
        pass
    
    HAS_SIMILARITY_CHECK = True
    logging.info("✅ duplicate_checker 正常にインポート完了")
            
except ImportError as e:
    logging.error(f"❌ duplicate_checker import error: {e}")
    # フォールバック用のダミー関数
    def get_existing_titles():
        return []
    def fetch_existing_titles():
        return []
    def get_stats():
        return {}
    def check_title_similarity(title, existing_titles):
        return True
    def is_duplicate_title(title, existing_titles):
        return False
    def save_generated_title(title):
        pass
    HAS_SIMILARITY_CHECK = False

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

class ArticleGeneratorWrapper:
    """
    記事生成ラッパークラス
    重複チェック機能付きの統一的な記事生成インターフェースを提供
    新しいディレクトリ構造とライセンス管理に対応
    """
    
    # 技術スタック設定（アダプター対応）
    TECH_STACKS = {
        "wordpress": {
            "name": "WordPress",
            "module_path": "modules.adapters",
            "class_name": "WordPressGenerator",
            "category_id": 2,
            "description": "WordPress開発、PHP、フック、REST API関連"
        },
        "javascript": {
            "name": "JavaScript",
            "module_path": "modules.adapters", 
            "class_name": "JavaScriptGenerator",
            "category_id": 6,
            "description": "JavaScript、TypeScript、Node.js、ES6+関連"
        },
        "python": {
            "name": "Python",
            "module_path": "modules.adapters",
            "class_name": "PythonGenerator",
            "category_id": 7,
            "description": "Python、Django、FastAPI、データサイエンス関連"
        },
        "react": {
            "name": "React",
            "module_path": "modules.adapters",
            "class_name": "ReactGenerator",
            "category_id": 8,
            "description": "React、Next.js、Hooks、パフォーマンス最適化関連"
        },
        "vue": {
            "name": "Vue.js",
            "module_path": "modules.adapters",
            "class_name": "VueGenerator",
            "category_id": 9,
            "description": "Vue.js、Nuxt.js、Composition API関連"
        },
        "sql": {
            "name": "SQL・データベース",
            "module_path": "modules.adapters",
            "class_name": "SQLGenerator",
            "category_id": 34,
            "description": "MySQL、SQL文、データベース設計、phpMyAdmin"
        }
    }
    
    def __init__(self):
        """初期化"""
        self.generated_count = 0
        logging.info("🎯 記事生成ラッパー初期化完了（新構造対応）")
        if HAS_SIMILARITY_CHECK:
            logging.info("✅ 重複チェック機能: 有効")
        else:
            logging.info("⚠️ 重複チェック機能: 基本モード")
    
    def get_generator_instance(self, technology: str):
        """
        指定された技術のジェネレーターインスタンスを取得
        
        Args:
            technology (str): 技術名
            
        Returns:
            object: ジェネレーターインスタンス
        """
        if technology not in self.TECH_STACKS:
            raise ValueError(f"未対応の技術: {technology}")
        
        stack_info = self.TECH_STACKS[technology]
        
        try:
            # 動的インポート
            module = __import__(stack_info["module_path"], fromlist=[stack_info["class_name"]])
            generator_class = getattr(module, stack_info["class_name"])
            return generator_class()
            
        except (ImportError, AttributeError) as e:
            logging.error(f"❌ ジェネレーター取得エラー ({technology}): {e}")
            raise
    
    def post_article(self, article_text: str) -> bool:
        """
        生成済みテキストを WordPress に投稿する
        Application Passwords による Basic 認証を使用
        
        Returns:
            bool: 成功なら True、失敗なら False
        """
        try:
            # タイトルを先頭行から自動抽出
            title = article_text.splitlines()[0].strip()
            data = {
                'title': title,
                'content': article_text,
                'status': config.post_status,
                'categories': [config.category_id]
            }
            url = f"{config.wp_site_url}/wp-json/wp/v2/posts"
            resp = requests.post(
                url,
                auth=(config.wp_user, config.wp_app_pass),
                json=data,
                timeout=30
            )
            resp.raise_for_status()
            logging.info(f"✅ 投稿成功: {title}")
            return True
        except Exception as e:
            logging.error(f"❌ 投稿エラー: {e}")
            return False
    
    def generate_with_duplicate_check(self, generator=None, count=1, technology="wordpress"):
        """
        重複チェック付き記事生成（新構造対応）
        """
        logging.info(f"📝 {technology}記事を{count}件生成開始（重複チェック付き）")
        
        # ジェネレーター取得
        if generator is None:
            try:
                generator = self.get_generator_instance(technology)
            except Exception as e:
                logging.error(f"❌ ジェネレーター取得失敗: {e}")
                return False
        
        # 既存タイトル取得
        existing_titles = get_existing_titles()
        logging.info(f"📊 既存記事数: {len(existing_titles)}件")
        
        success_count = 0
        for i in range(count):
            try:
                if hasattr(generator, 'generate_article'):
                    result = generator.generate_article()
                elif hasattr(generator, 'generate_articles'):
                    result = generator.generate_articles(1)
                else:
                    logging.error(f"❌ {type(generator).__name__} に生成メソッドがありません")
                    continue
                
                if result:
                    success_count += 1
                    logging.info(f"✅ {technology}記事 {i+1}/{count} 生成完了")
                else:
                    logging.warning(f"⚠️ {technology}記事 {i+1}/{count} 生成失敗")
            except Exception as e:
                logging.error(f"❌ {technology}記事 {i+1}/{count} エラー: {e}")
            
            if i < count - 1:
                time.sleep(3)
        
        if success_count > 0:
            self.generated_count += success_count
            logging.info(f"🎉 {technology}記事生成完了: {success_count}/{count}件成功")
            try:
                stats = get_stats()
                logging.info(f"📊 重複チェック統計: 総チェック数={stats.get('total_checks', 0)}, 重複検出数={stats.get('duplicates_found', 0)}")
            except Exception:
                pass
            return True
        else:
            logging.error(f"❌ {technology}記事生成失敗: 0/{count}件成功")
            return False
    
    # 以下 generate_new_topics～show_available_techs は省略せずに既存のまま残してください
    # （省略せずお使いください）


    def generate_new_topics(self, count, existing_titles, tech_stack="wordpress"):
        """
        指定された技術スタック向けの新規トピックを生成（改善版）
        """
        # 既存タイトルの一部を例として表示（最大5件に制限）
        example_titles = list(existing_titles)[:5]  # 5件に制限
        existing_examples = "\n".join(f"- {t}" for t in example_titles)
        if len(existing_titles) > 5:
            existing_examples += f"\n... （他 {len(existing_titles) - 5} 件）"

        # tech_stacks.jsonから設定を読み込み（将来的に実装）
        tech_prompts = {
            "wordpress": {
                "system": "あなたはWordPress開発を学ぶ初心者から中級者に向けて、分かりやすく実践的な技術記事を作成してください。",
                "focus": "WordPress開発で使える具体的なトピック。PHP関数やフック、APIに関するもの",
                "format": "「○○する方法」「○○の例」「○○を実装する」のような形式"
            },
            "javascript": {
                "system": "あなたはJavaScript/TypeScript エンジニア向けのトピック提案アシスタントです。",
                "focus": "JavaScript、TypeScript、Node.js開発で使える実践的なトピック",
                "format": "「○○のベストプラクティス」「○○を使った○○」のような形式"
            },
            "python": {
                "system": "あなたはPython エンジニア向けのトピック提案アシスタントです。",
                "focus": "Python、Django、FastAPI、データサイエンス開発で使える実用的なトピック",
                "format": "「○○で○○を構築する方法」「○○を使った○○処理」のような形式"
            },
            "react": {
                "system": "あなたはReact/Next.js エンジニア向けのトピック提案アシスタントです。",
                "focus": "React、Next.js、Hooks、状態管理で使える実践的なトピック",
                "format": "「○○でコンポーネント作成」「○○を使った状態管理」のような形式"
            },
            "vue": {
                "system": "あなたはVue.js/Nuxt.js エンジニア向けのトピック提案アシスタントです。",
                "focus": "Vue.js、Nuxt.js、Composition API で使える実践的なトピック",
                "format": "「○○でコンポーネント作成」「○○を使った状態管理」のような形式"
            },
            "sql": {
                "system": "あなたはSQL・データベースを学ぶ初心者から中級者に向けて、実践的な技術記事を作成してください。",
                "focus": "MySQL、SQL文、データベース設計、phpMyAdminで使える実用的なトピック",
                "format": "「○○でデータベース操作」「○○を使ったSQL」のような形式"
            }
        }

        tech_config = tech_prompts.get(tech_stack, tech_prompts["wordpress"])
        stack_info = self.TECH_STACKS.get(tech_stack, self.TECH_STACKS["wordpress"])

        # プロンプトを簡潔に修正
        prompt = f"""
        {stack_info['name']}エンジニア向けの実用的なトピックを日本語で {count} 個生成してください。

        既存タイトル例：
        {existing_examples}

        要件：
        - {tech_config['focus']}
        - 既存タイトルと重複しないもの
        - {tech_config['format']}
        - 実際の開発現場で役立つ内容

        以下の形式で出力してください：
        1. [トピック1]
        2. [トピック2]
        3. [トピック3]
        """

        payload = {
            "model": "gpt-3.5-turbo",
            "messages": [
                {"role": "system", "content": tech_config['system']},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.8,  # 少し上げて創造性を高める
            "max_tokens": 600,   # 少し減らして効率化
        }

        try:
            resp = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=config.get_openai_headers(),
                json=payload,
                timeout=60
            )
            
            logging.info(f"OpenAI API レスポンス: {resp.status_code}")
            
            if resp.status_code != 200:
                logging.error(f"OpenAI API エラー: {resp.status_code} - {resp.text}")
                return []
                
            resp.raise_for_status()
            data = resp.json()
            
            logging.info(f"OpenAI API データ: {json.dumps(data, ensure_ascii=False, indent=2)[:500]}...")
            
        except requests.exceptions.Timeout:
            logging.error("generate_new_topics(): OpenAI API タイムアウト")
            return []
        except requests.exceptions.RequestException as e:
            logging.error(f"generate_new_topics(): OpenAI API リクエストエラー: {e}")
            return []
        except Exception as e:
            logging.error(f"generate_new_topics(): 予期しないエラー: {e}")
            return []

        if "choices" not in data or not data["choices"]:
            logging.error(f"generate_new_topics(): 無効なAPIレスポンス: {data}")
            return []

        text = data["choices"][0]["message"]["content"].strip()
        logging.info(f"生成されたテキスト: {text}")
        
        # より堅牢なテキスト解析
        lines = text.splitlines()
        new_topics = []

        for line in lines:
            line = line.strip()
            
            # 数字付きリスト形式を解析
            if line and (line[0].isdigit() or line.startswith('-') or line.startswith('•')):
                # 番号や記号を削除
                item = line
                for prefix in ['1.', '2.', '3.', '4.', '5.', '-', '•', '*']:
                    if item.startswith(prefix):
                        item = item[len(prefix):].strip()
                        break
                
                # さらにクリーンアップ
                item = item.strip()
                if item and len(item) > 5:  # 最低限の長さチェック
                    # 既存タイトルとの重複チェック（大文字小文字を無視）
                    if check_title_similarity(item, existing_titles):
                        if item not in new_topics:  # 生成リスト内での重複チェック
                            new_topics.append(item)
            
            if len(new_topics) >= count:
                break

        logging.info(f"generate_new_topics({tech_stack}): {len(new_topics)} 件生成")
        for i, topic in enumerate(new_topics, 1):
            logging.info(f"  {i}. {topic}")
        
        return new_topics
    
    def get_generation_stats(self):
        """生成統計取得"""
        return {
            'total_generated': self.generated_count,
            'duplicate_stats': get_stats()
        }
    
    def show_available_techs(self):
        """利用可能な技術スタック一覧を表示"""
        logging.info("🔧 利用可能な技術スタック:")
        logging.info("=" * 50)
        for tech, info in self.TECH_STACKS.items():
            status = "🚧 開発中" if tech == 'sql' else "✅ 利用可能"
            logging.info(f"📁 {tech}: {info['name']} ({status})")
            logging.info(f"   - {info['description']}")
            logging.info(f"   - カテゴリID: {info['category_id']}")
            logging.info("")


    def create_wrapper():
        """ラッパーインスタンス作成"""
        return ArticleGeneratorWrapper()


    if __name__ == "__main__":
        # テスト実行
        print("🧪 Article Generator Wrapper テスト（import修正版）")
        
        try:
            wrapper = ArticleGeneratorWrapper()
            stats = wrapper.get_generation_stats()
            print(f"✅ ラッパー初期化成功")
            print(f"📊 現在の統計: {stats}")
            
            # 利用可能技術表示
            wrapper.show_available_techs()
            
        except Exception as e:
            print(f"❌ テストエラー: {e}")


    def generate_with_messages(self, messages: list[dict]) -> str | None:
        """
        build_messages で作った messages をそのまま OpenAI に投げて
        生テキストを返す。
        """
        import openai
        # 🆕 使うモデルをログ出力
        logging.info(f"🤖 OpenAI API 呼び出しモデル: {config.openai_model}")

        # API 呼び出し
        resp = openai.ChatCompletion.create(
            model=config.openai_model,
            messages=messages,
            temperature=0.8,
            max_tokens=1500
        )

        # 応答チェック
        if not resp.choices:
            logging.error("❌ OpenAI API から choices が返ってきませんでした")
            return None

        # 本文抽出
        content = resp.choices[0].message.content.strip()
        return content

    def rewrite_with_feedback(self, original: str, scores: dict) -> str | None:
        """
        フィードバックスコアをもとに、リライトプロンプトを組んで再生成。
        """
        prompt = (
            f"以下の記事の評価スコアは {scores} でした。\n"
            "可読性やエンゲージメントを改善するために、"
            "よりキャッチーで読みやすい文章に書き直してください。\n\n"
            f"【元記事】\n{original}"
        )
        # 簡易的に system/user だけで呼び出し
        messages = [
        {"role":"system","content":"あなたは記事のリライト専門家です。"},
        {"role":"user","content":prompt}
        ]
        return self.generate_with_messages(messages)
