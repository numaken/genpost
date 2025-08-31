#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import sys
import os
import logging

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.license_manager import LicenseManager
from core.config import config

logging.basicConfig(
    level=logging.DEBUG,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

class MainController:
    def __init__(self):
        self.license_manager = LicenseManager()
        logging.info("🚀 WordPress Auto Generator System 起動")
    
    def show_info(self):
        print("\n🚀 WordPress Auto Generator System")
        print("=" * 60)
        self.license_manager.show_edition_info()
        print("🛠️  システム情報:")
        print(f"   サイトURL: {config.wp_site_url}")
        print("=" * 60 + "\n")
    
    def generate_articles(self, technology: str, count: int):
        """記事生成機能"""
        logging.info(f"🔍 記事生成開始: technology={technology}, count={count}")
        
        # 技術スタックアクセス確認
        access_check = self.license_manager.check_technology_access(technology)
        logging.info(f"🔍 技術スタックアクセス確認: {access_check}")
        if not access_check:
            return False
        
        # 使用制限確認
        limit_check = self.license_manager.check_usage_limit(count)
        logging.info(f"🔍 使用制限確認: {limit_check}")
        if not limit_check:
            return False
        
        try:
            logging.info("🔍 アダプターインポート開始")
            from modules.adapters import get_generator
            logging.info("✅ アダプターインポート完了")
            
            logging.info(f"🔍 ジェネレーター取得: {technology}")
            generator = get_generator(technology)
            logging.info(f"✅ ジェネレーター取得完了: {type(generator)}")
            
            logging.info(f"📝 {technology.capitalize()}記事を{count}件生成開始...")
            
            for i in range(count):
                logging.info(f"🔍 記事 {i+1}/{count} 生成開始")
                
                try:
                    # ジェネレーターのメソッド確認
                    logging.info(f"🔍 ジェネレーターのメソッド: {dir(generator)}")
                    
                    # 実際のAI記事生成を呼び出し
                    if hasattr(generator, 'generate'):
                        logging.info("🔍 generator.generate() 呼び出し開始")
                        article = generator.generate()
                        logging.info(f"🔍 記事生成結果: {type(article)}, 長さ: {len(str(article)) if article else 0}")
                    else:
                        logging.error("❌ generator.generate() メソッドが存在しません")
                        article = None
                    
                    if article:
                        logging.info(f"📄 記事内容生成完了: {len(str(article))}文字")
                        
                        # WordPressに投稿
                        if hasattr(generator, 'post_to_wordpress'):
                            logging.info("🔍 generator.post_to_wordpress() 呼び出し開始")
                            post_result = generator.post_to_wordpress(article)
                            logging.info(f"🔍 投稿結果: {post_result}")
                            if post_result:
                                logging.info(f"✅ 記事 {i+1}/{count} WordPress投稿完了")
                            else:
                                logging.error(f"❌ 記事 {i+1}/{count} WordPress投稿失敗")
                        else:
                            logging.error("❌ generator.post_to_wordpress() メソッドが存在しません")
                    else:
                        logging.error(f"❌ 記事 {i+1}/{count} 生成失敗")
                        
                except Exception as gen_error:
                    logging.error(f"❌ 記事 {i+1}/{count} 生成エラー: {gen_error}")
                    import traceback
                    logging.error(f"スタックトレース: {traceback.format_exc()}")
            
            # 使用量記録
            logging.info("🔍 使用量記録開始")
            self.license_manager.record_usage(count)
            logging.info(f"✅ {technology.capitalize()}記事{count}件の生成が完了しました")
            return True
            
        except Exception as e:
            logging.error(f"❌ 記事生成エラー: {e}")
            import traceback
            logging.error(f"スタックトレース: {traceback.format_exc()}")
            return False

def main():
    parser = argparse.ArgumentParser(description='WordPress Auto Generator System')
    parser.add_argument('--info', action='store_true', help='システム情報を表示')
    parser.add_argument('--tech', choices=['wordpress'], help='技術スタック')
    parser.add_argument('--count', type=int, default=1, help='生成数')
    
    args = parser.parse_args()
    
    if len(sys.argv) == 1:
        parser.print_help()
        return
    
    controller = MainController()
    
    if args.info:
        controller.show_info()
    elif args.tech:
        controller.generate_articles(args.tech, args.count)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
