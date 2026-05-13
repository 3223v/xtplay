
from __future__ import annotations

import os
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, Union, List, Dict

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

ROLE_DEFAULTS: Dict[str, Any] = {
    "spec": "",
    "name": "",
    "description": "",
    "personality": "",
    "first_mes": "",
    "avatar": "",
    "mes_example": "",
    "scenario": "",
    "creator_notes": "",
    "system_prompt": "",
    "post_history_instructions": "",
    "alternate_greetings": [],
    "tags": [],
}

PRESET_DEFAULTS: Dict[str, Any] = {
    "temperature": 0.75,
    "frequency_penalty": 0.8,
    "presence_penalty": 0.8,
    "top_p": 0.99,
    "top_k": 75,
    "top_a": 0,
    "min_p": 0.1,
    "repetition_penalty": 1.1,
    "names_in_completion": True,
    "main_prompt": "",
    "impersonation_prompt": "",
    "assistant_prefill": "",
    "jailbreak_prompt": "",
}

ENTRY_DEFAULTS: Dict[str, Any] = {
    "uid": 0,
    "key": [],
    "keysecondary": [],
    "comment": "",
    "content": "",
    "order": 100,
}

LOREBOOK_DEFAULTS: Dict[str, Any] = {
    "name": "",
    "description": "",
    "scan_depth": 50,
    "token_budget": 500,
    "entries": {},
}

CONTENT_TABLES = {"roles", "presets", "entries", "lorebooks"}
PROMPT_KEYS = {"key", "title", "category", "description", "content"}


def _coerce_int(value: Any) -> Union[int, None]:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            return int(text)
        except ValueError:
            return None
    return None


def _coerce_float(value: Any) -> Union[float, None]:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            return float(text)
        except ValueError:
            return None
    return None


def _coerce_bool(value: Any) -> Union[bool, None]:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        text = value.strip().lower()
        if text in {"true", "1", "yes", "y"}:
            return True
        if text in {"false", "0", "no", "n"}:
            return False
    return None


def _coerce_string_list(value: Any) -> Union[List[str], None]:
    if isinstance(value, list):
        return [str(item) for item in value if item is not None]
    if isinstance(value, str):
        return [part.strip() for part in value.split(",") if part.strip()]
    return None


def _coerce_by_default(value: Any, default: Any) -> Any:
    if isinstance(default, bool):
        return _coerce_bool(value) if _coerce_bool(value) is not None else deepcopy(default)
    if isinstance(default, int) and not isinstance(default, bool):
        return _coerce_int(value) if _coerce_int(value) is not None else deepcopy(default)
    if isinstance(default, float):
        return _coerce_float(value) if _coerce_float(value) is not None else deepcopy(default)
    if isinstance(default, str):
        return value if isinstance(value, str) else deepcopy(default)
    if isinstance(default, list):
        return _coerce_string_list(value) if _coerce_string_list(value) is not None else deepcopy(default)
    if isinstance(default, dict):
        return deepcopy(value) if isinstance(value, dict) else deepcopy(default)
    return deepcopy(value)


DATABASE_URL = (
    os.getenv("XTPLAY_DATABASE_URL")
    or os.getenv("DATABASE_URL")
    or os.getenv("POSTGRES_DSN")
    or "postgresql://postgres:root@localhost:5432/xtplay"
)


def connect() -> psycopg.Connection:
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def _iso(value: Any) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value or "")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _format_output(action: Any, dialogue: Any) -> str:
    parts = []
    action_text = str(action or "").strip()
    dialogue_text = str(dialogue or "").strip()
    if action_text:
        parts.append(action_text)
    if dialogue_text:
        parts.append('"{0}"'.format(dialogue_text))
    return "\n".join(parts)

