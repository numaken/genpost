# core/feedback.py
from textstat import flesch_reading_ease

def calculate_readability(text: str) -> float:
    """
    Flesch 読みやすさスコアを返します。
    """
    try:
        return flesch_reading_ease(text)
    except Exception:
        return 0.0

def check_originality(text: str) -> float:
    """
    ダミーのオリジナリティチェック（文章の長さに比例して高くなる簡易実装）。
    """
    return min(1.0, len(text) / 1000)

def analyze_engagement(text: str) -> float:
    """
    「！」の数でエンゲージメントを簡易推定。
    """
    return text.count("！") * 0.1

def evaluate_content(text: str) -> dict:
    """
    総合評価を dict で返却。
    """
    return {
        "readability": calculate_readability(text),
        "originality": check_originality(text),
        "engagement": analyze_engagement(text),
    }
