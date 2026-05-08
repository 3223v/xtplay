from __future__ import annotations

from pathlib import Path


APP_DIR = Path(__file__).resolve().parents[1]
BASE_DIR = APP_DIR.parent
DATA_DIR = BASE_DIR / "data"
