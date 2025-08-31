#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Prompt Manager - プロンプトマーケットプレイス管理システム
プロンプトパックの管理、ライセンス確認、動的読み込みを担当
"""

import os
import logging
from typing import Dict, Any, Optional, List
from pathlib import Path
import json
import requests
import zipfile
import io

BASE_DIR = Path("prompts/packs")

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

class PromptManager:
    """
    プロンプトマネージャー
    プロンプトパックの管理とライセンス制御を提供
    """
    
    def __init__(self):
        """プロンプトマネージャー初期化"""
        
        self.prompt_dir = Path("prompts")
        self.packs_dir = self.prompt_dir / "packs"
        self.templates_dir = self.prompt_dir / "templates"
        self.packs = self._discover_packs()

        # ディレクトリ作成
        self.packs_dir.mkdir(parents=True, exist_ok=True)
        self.templates_dir.mkdir(parents=True, exist_ok=True)
        
        # インストール済みパック読み込み
        self.installed_packs = self._load_installed_packs()
        
        logging.info("🎯 プロンプト管理システム初期化完了")
        logging.info(f"📦 インストール済みパック数: {len(self.installed_packs)}")


    def _discover_packs(self) -> dict[str,dict]:
        """
        prompts/packs 以下をスキャンして
        { "cooking:lunch": {"domain":"cooking","category":"lunch", ...}, ... }
        として返す。
        """
        packs = {}
        for domain_dir in BASE_DIR.iterdir():
            if not domain_dir.is_dir(): continue
            for cat_dir in domain_dir.iterdir():
                if not cat_dir.is_dir(): continue
                pack_id = f"{domain_dir.name}:{cat_dir.name}"
                # もし metadata.json があれば読み込む
                meta_file = cat_dir / "metadata.json"
                info = {"domain":domain_dir.name, "category":cat_dir.name}
                if meta_file.exists():
                    try:
                        info.update(json.loads(meta_file.read_text(encoding="utf-8")))
                    except:
                        pass
                packs[pack_id] = info
        return packs


    
    def get_prompt(self, pack_id: str) -> str:
        """
        pack_id="cooking:lunch" のように指定されたら
        prompts/packs/cooking/lunch/{headings,instructions,samples}.md
        を読み込んで結合し、そのまま返します。
        """
        try:
            domain, category = pack_id.split(":", 1)
            pack_dir = BASE_DIR / domain / category
            from core.prompt_builder import load_section

            sections = [
                load_section(pack_dir, "headings.md"),
                load_section(pack_dir, "instructions.md"),
                load_section(pack_dir, "samples.md"),
            ]
            logging.info(f"✅ プロンプト読み込み: {pack_id}")
            return "\n\n".join(sections)
        except Exception as e:
            logging.error(f"❌ プロンプト読み込みエラー ({pack_id}): {e}")
            raise

    
    def list_available_packs(self) -> dict[str, dict]:
        """
        prompts/packs 以下を走査し、
        {"cooking:lunch": {...}, ...} の形式で返します
        """
        packs = {}
        for domain_dir in BASE_DIR.iterdir():
            if not domain_dir.is_dir(): continue
            for cat_dir in domain_dir.iterdir():
                if not cat_dir.is_dir(): continue
                pack_id = f"{domain_dir.name}:{cat_dir.name}"
                packs[pack_id] = {
                    "domain": domain_dir.name,
                    "category": cat_dir.name,
                }
        return packs
    
    def install_pack(self, pack_file_path: str) -> bool:
        """
        プロンプトパックインストール
        
        Args:
            pack_file_path (str): パックファイルパス
            
        Returns:
            bool: インストール成功かどうか
        """
        try:
            # パックファイル読み込み
            with open(pack_file_path, 'r', encoding='utf-8') as f:
                pack_data = json.load(f)
            
            # バリデーション
            if not self._validate_pack(pack_data):
                logging.error("❌ 無効なプロンプトパック形式")
                return False
            
            pack_id = pack_data["pack_id"]
            
            # インストール先パス
            install_path = self.packs_dir / f"{pack_id}.json"
            
            # インストール実行
            with open(install_path, 'w', encoding='utf-8') as f:
                json.dump(pack_data, f, ensure_ascii=False, indent=2)
            
            # インストール済みリストに追加
            self.installed_packs[pack_id] = pack_data
            
            logging.info(f"✅ プロンプトパックインストール完了: {pack_data['name']}")
            return True
            
        except Exception as e:
            logging.error(f"❌ プロンプトパックインストールエラー: {e}")
            return False
    
    def uninstall_pack(self, pack_id: str) -> bool:
        """
        プロンプトパックアンインストール
        
        Args:
            pack_id (str): パックID
            
        Returns:
            bool: アンインストール成功かどうか
        """
        try:
            if pack_id not in self.installed_packs:
                logging.warning(f"⚠️ パックが見つかりません: {pack_id}")
                return False
            
            # ファイル削除
            pack_file = self.packs_dir / f"{pack_id}.json"
            if pack_file.exists():
                pack_file.unlink()
            
            # インストール済みリストから削除
            del self.installed_packs[pack_id]
            
            logging.info(f"✅ プロンプトパックアンインストール完了: {pack_id}")
            return True
            
        except Exception as e:
            logging.error(f"❌ プロンプトパックアンインストールエラー: {e}")
            return False
    
    def get_pack_info(self, pack_id: str) -> Optional[Dict[str, Any]]:
        """プロンプトパック情報取得"""
        return self.installed_packs.get(pack_id)
    
    def _load_installed_packs(self) -> Dict[str, Any]:
        """インストール済みプロンプトパック読み込み"""
        installed = {}
        
        try:
            if not self.packs_dir.exists():
                return installed
            
            # .jsonファイルを全て読み込み
            for pack_file in self.packs_dir.glob("*.json"):
                try:
                    with open(pack_file, 'r', encoding='utf-8') as f:
                        pack_data = json.load(f)
                    
                    pack_id = pack_data.get("pack_id")
                    if pack_id:
                        installed[pack_id] = pack_data
                        logging.info(f"📦 プロンプトパック読み込み: {pack_data.get('name', pack_id)}")
                    
                except Exception as e:
                    logging.warning(f"⚠️ パックファイル読み込みエラー: {pack_file} - {e}")
            
            return installed
            
        except Exception as e:
            logging.error(f"❌ インストール済みパック読み込みエラー: {e}")
            return {}
    
    def _get_default_prompt(self, prompt_type: str) -> str:
        """デフォルトプロンプト取得"""
        default_prompts = {
            "wordpress": """
あなたはWordPress開発を学ぶ初心者から中級者に向けて、分かりやすく実践的な技術記事を作成してください。
専門用語は必ず説明を加え、「なぜそうするのか」「どんな時に使うのか」を丁寧に解説してください。
コードは動作確認済みで、初心者でも安全に実装できるよう、手順を段階的に説明し、よくあるエラーと対処法も含めてください。
""",
            "javascript": """
あなたはJavaScript/TypeScript エンジニア向けのトピック提案アシスタントです。
JavaScript、TypeScript、Node.js開発で使える実践的なトピックを、初心者にも分かりやすく解説してください。
""",
            "python": """
あなたはPython エンジニア向けのトピック提案アシスタントです。
Python、Django、FastAPI、データサイエンス開発で使える実用的なトピックを解説してください。
""",
            "react": """
あなたはReact/Next.js エンジニア向けのトピック提案アシスタントです。
React、Next.js、Hooks、状態管理で使える実践的なトピックを解説してください。
""",
            "vue": """
あなたはVue.js/Nuxt.js エンジニア向けのトピック提案アシスタントです。
Vue.js、Nuxt.js、Composition API で使える実践的なトピックを解説してください。
""",
            "cooking": """
あなたは料理研究家として、家庭で作りやすいレシピ記事を作成してください。
初心者でも失敗しないよう、材料の分量や調理手順を具体的に説明し、コツやポイントも含めてください。
""",
            "travel": """
あなたは旅行ライターとして、実用的で魅力的な旅行記事を作成してください。
読者が実際に旅行プランを立てられるよう、具体的な情報を含めてください。
""",
            "business": """
あなたはビジネスコンサルタントとして、実践的なビジネス記事を作成してください。
理論だけでなく、具体的な実行ステップや成功事例を含めてください。
""",
            "health": """
あなたは健康インストラクターとして、科学的根拠に基づいた健康記事を作成してください。
安全で実践しやすい方法を紹介してください。
"""
        }
        
        return default_prompts.get(prompt_type, default_prompts["wordpress"])
    
    def _get_fallback_prompt(self) -> str:
        """フォールバックプロンプト（エラー時）"""
        return """
あなたは専門ライターとして、読者に役立つ実用的な記事を作成してください。
分かりやすい説明と具体的な例を含めて、価値のあるコンテンツを提供してください。
"""
    
    def _validate_pack(self, pack_data: Dict[str, Any]) -> bool:
        """プロンプトパックバリデーション"""
        required_fields = ["pack_id", "name", "version", "prompts"]
        
        for field in required_fields:
            if field not in pack_data:
                logging.error(f"❌ 必須フィールドが不足: {field}")
                return False
        
        # プロンプト形式確認
        prompts = pack_data.get("prompts", {})
        if not isinstance(prompts, dict):
            logging.error("❌ prompts フィールドは辞書である必要があります")
            return False
        
        return True

    def create_sample_pack(self, pack_id: str, pack_name: str) -> bool:
        """
        サンプルプロンプトパック作成（開発・テスト用）
        
        Args:
            pack_id (str): パックID
            pack_name (str): パック名
            
        Returns:
            bool: 作成成功かどうか
        """
        try:
            sample_pack = {
                "pack_id": pack_id,
                "name": pack_name,
                "version": "1.0.0",
                "description": f"{pack_name}用のサンプルプロンプトパック",
                "price": 2980,
                "prompts": {
                    pack_id: {
                        "name": f"{pack_name}記事生成",
                        "system_prompt": f"""
あなたは{pack_name}の専門家として、読者に役立つ{pack_name}記事を作成してください。
実用的で具体的な内容を心がけ、初心者にも分かりやすく解説してください。
専門用語は必ず説明を加え、実際に使える情報を提供してください。

記事の構成:
1. 導入・背景説明
2. 基本的な概念解説
3. 具体的な方法・手順
4. 実例・サンプル
5. 注意点・コツ
6. まとめ・次のステップ

対象読者: {pack_name}に興味がある初心者〜中級者
""",
                        "keywords": [pack_name, "初心者", "方法", "コツ", "実用的"],
                        "target_readers": f"{pack_name}に興味がある方、初心者"
                    }
                }
            }
            
            # ファイル保存
            pack_file = self.packs_dir / f"{pack_id}.json"
            with open(pack_file, 'w', encoding='utf-8') as f:
                json.dump(sample_pack, f, ensure_ascii=False, indent=2)
            
            # インストール済みリストに追加
            self.installed_packs[pack_id] = sample_pack
            
            logging.info(f"✅ サンプルプロンプトパック作成完了: {pack_name}")
            return True
            
        except Exception as e:
            logging.error(f"❌ サンプルパック作成エラー: {e}")
            return False


def get_prompt_manager() -> PromptManager:
    """プロンプトマネージャーのインスタンス取得"""
    return PromptManager()


if __name__ == "__main__":
    # テスト実行
    print("🧪 プロンプト管理システム テスト")
    print("=" * 50)
    
    # マネージャー初期化
    manager = PromptManager()
    
    # サンプルパック作成テスト
    manager.create_sample_pack("cooking", "料理・レシピ")
    manager.create_sample_pack("travel", "旅行・観光")

    # プロンプト取得テスト
    cooking_prompt = manager.get_prompt("cooking", "cooking")
    print(f"🍳 料理プロンプト取得成功: {len(cooking_prompt)}文字")

    # パック一覧取得テスト
    packs = manager.list_available_packs()
    print(f"📦 利用可能パック数: {len(packs)}")

    for pack_id, info in packs.items():
        print(f"   📋 {info['name']} (v{info['version']})")

    print("\n✅ プロンプト管理システムテスト完了")