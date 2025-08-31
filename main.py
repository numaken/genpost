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
    level=logging.INFO,
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
        # 技術スタックアクセス確認
        if not self.license_manager.check_technology_access(technology):
            return False
        
        # 使用制限確認
        if not self.license_manager.check_usage_limit(count):
            return False
        
        try:
            from modules.adapters import get_generator
            
            logging.info(f"📝 {technology.capitalize()}記事を{count}件生成開始...")
            
            generator = get_generator(technology)
            
            success_count = 0
            for i in range(count):
                logging.info(f"▶ [{i+1}/{count}] 記事生成中...")
                
                try:
                    # 正しいメソッド名で呼び出し（generate_articleは生成＋投稿を同時実行）
                    result = generator.generate_article()
                    
                    if result:
                        logging.info(f"✅ 記事 {i+1}/{count} 生成・投稿完了")
                        success_count += 1
                    else:
                        logging.error(f"❌ 記事 {i+1}/{count} 生成・投稿失敗")
                        
                except Exception as gen_error:
                    logging.error(f"❌ 記事 {i+1}/{count} 生成エラー: {gen_error}")
            
            # 使用量記録
            if success_count > 0:
                self.license_manager.record_usage(success_count)
                logging.info(f"✅ {technology.capitalize()}記事{success_count}件の生成が完了しました")
            else:
                logging.error("❌ 記事の生成に失敗しました（0件成功）")
            
            return success_count > 0
            
        except Exception as e:
            logging.error(f"❌ 記事生成エラー: {e}")
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
        success = controller.generate_articles(args.tech, args.count)
        if not success:
            sys.exit(1)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
