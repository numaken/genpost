#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generator Adapters - プロンプトマーケットプレイス 新パイプライン対応版
※ 現状 WordPress のみ対応。その他は未実装として例外を投げます。
"""

import logging

from modules.wordpress.generator import WordPressGenerator

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

def get_generator(technology: str, prompt_pack: list[tuple[str,str]] = None):
    """
    指定技術のジェネレーターインスタンスを返す
    prompt_pack を渡すと、そのパックで動作します
    """
    if technology == 'wordpress':
        return WordPressGenerator(prompt_pack)
    else:
        raise NotImplementedError(f"{technology} ジェネレーターは未実装です")