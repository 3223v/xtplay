from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict


class AppModel(BaseModel):
    model_config = ConfigDict(extra="ignore")


def empty_list() -> list[str]:
    return []


def empty_dict() -> dict[str, Any]:
    return {}


def digit_key_map_validator(entries: dict[str, Any]) -> dict[str, Any]:
    invalid_keys = [key for key in entries.keys() if not key.isdigit()]
    if invalid_keys:
        raise ValueError(f"entries keys must be digit strings: {', '.join(invalid_keys)}")
    return entries
