# core/variation.py
import random

PATTERNS = [
    "問題提起→解決策→具体例→まとめ",
    "体験談→教訓→応用方法→行動促進",
    "比較→分析→推奨→理由説明"
]

def pick_structure() -> str:
    """
    ランダムに構成パターンを返します。
    """
    return random.choice(PATTERNS)
