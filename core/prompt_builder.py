# core/prompt_builder.py
from pathlib import Path
from core.emergent import get_seasonal_note
from core.variation import pick_structure

BASE_DIR = Path("prompts/packs")

def load_section(pack_path: Path, filename: str) -> str:
    return (pack_path / filename).read_text(encoding='utf-8').strip()

def build_messages(selected_packs: list[tuple[str,str]]) -> list[dict]:
    sys_msgs, user_msgs = [], []
    for domain, category in selected_packs:
        pack_dir = BASE_DIR / domain / category
        sys_msgs.append({"role":"system", "content": load_section(pack_dir, "headings.md")})
        sys_msgs.append({"role":"system", "content": load_section(pack_dir, "instructions.md")})
        user_msgs.append({"role":"user", "content": load_section(pack_dir, "samples.md")})
    return sys_msgs + user_msgs