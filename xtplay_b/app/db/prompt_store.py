
from __future__ import annotations

from copy import deepcopy
from typing import Dict, Any

from .base import connect, _iso, _now_iso, PROMPT_KEYS


class PostgresPromptStore:
    def list_all(self) -> list:
        with connect() as conn:
            rows = conn.execute(
                """
                select key, title, category, description, content, created_at, updated_at
                from prompts
                order by category, key
                """
            ).fetchall()
        return [self._row_to_prompt(row) for row in rows]

    def get(self, key: str) -> Any:
        clean_key = key.strip()
        if not clean_key:
            return None
        with connect() as conn:
            row = conn.execute(
                """
                select key, title, category, description, content, created_at, updated_at
                from prompts
                where key = %s
                """,
                (clean_key,),
            ).fetchone()
        return self._row_to_prompt(row) if row is not None else None

    def replace(self, key: str, payload: Dict[str, Any]) -> Any:
        clean_key = key.strip()
        if not clean_key or self.get(clean_key) is None:
            return None
        data = self._shape_prompt({"key": clean_key, **payload})
        with connect() as conn:
            row = conn.execute(
                """
                update prompts
                set title = %s,
                    category = %s,
                    description = %s,
                    content = %s,
                    updated_at = now()
                where key = %s
                returning key, title, category, description, content, created_at, updated_at
                """,
                (
                    data["title"],
                    data["category"],
                    data["description"],
                    data["content"],
                    clean_key,
                ),
            ).fetchone()
        return self._row_to_prompt(row) if row is not None else None

    def patch(self, key: str, payload: Dict[str, Any]) -> Any:
        current = self.get(key)
        if current is None:
            return None
        patched = deepcopy(current)
        for field, value in payload.items():
            if field in PROMPT_KEYS and field != "key":
                patched[field] = value
        return self.replace(str(current["key"]), patched)

    def seed_defaults(self, defaults: list) -> None:
        with connect() as conn:
            for item in defaults:
                data = self._shape_prompt(item)
                if not data["key"]:
                    continue
                conn.execute(
                    """
                    insert into prompts (key, title, category, description, content)
                    values (%s, %s, %s, %s, %s)
                    on conflict (key) do nothing
                    """,
                    (
                        data["key"],
                        data["title"],
                        data["category"],
                        data["description"],
                        data["content"],
                    ),
                )

    def _shape_prompt(self, item: Dict[str, Any]) -> Dict[str, str]:
        return {
            "key": str(item.get("key", "")).strip(),
            "title": str(item.get("title", "")).strip(),
            "category": str(item.get("category", "")).strip(),
            "description": str(item.get("description", "")).strip(),
            "content": str(item.get("content", "")),
        }

    def _row_to_prompt(self, row: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "key": str(row["key"]),
            "title": str(row.get("title", "")),
            "category": str(row.get("category", "")),
            "description": str(row.get("description", "")),
            "content": str(row.get("content", "")),
            "created_at": _iso(row.get("created_at")),
            "updated_at": _iso(row.get("updated_at")),
        }

