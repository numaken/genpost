# core/emergent.py
from datetime import datetime

def get_seasonal_note() -> str:
    """
    現在の月に応じた季節ノートを返します。
    """
    m = datetime.now().month
    if 3 <= m <= 5:
        return "春の彩りを活かした食材を取り入れてください。"
    if 6 <= m <= 8:
        return "夏にぴったりのさっぱりメニューを提案してください。"
    if 9 <= m <= 11:
        return "秋の旬の味覚を楽しめるレシピを。"
    return "冬の身体が温まる料理をおすすめしてください。"
