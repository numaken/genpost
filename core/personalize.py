# core/personalize.py
import openai, json, os

def apply_persona(text: str, persona: str) -> str:
    """
    persona: JSON文字列 or JSONファイルパス
    """
    # JSON読み込み
    if os.path.isfile(persona):
        persona_data = json.load(open(persona, encoding='utf-8'))
    else:
        persona_data = json.loads(persona)

    prompt = f"読者ペルソナ情報: {persona_data}"
    resp = openai.ChatCompletion.create(
        model="gpt-4o",
        messages=[
            {"role":"system","content": prompt},
            {"role":"user","content": text}
        ]
    )
    return resp.choices[0].message.content
