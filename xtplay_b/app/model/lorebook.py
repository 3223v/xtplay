from __future__ import annotations

from typing import Any

from pydantic import Field

from app.model.common import AppModel
from app.model.entry import EntryCreate, EntryPatch, EntryRead, EntryReplace


class LorebookBase(AppModel):
    name: str = ""
    description: str = ""
    scan_depth: int = 50
    token_budget: int = 500
    entries: dict[str, Any] = Field(default_factory=dict)


class LorebookCreate(LorebookBase):
    entries: dict[str, Any] = Field(default_factory=dict)


class LorebookReplace(LorebookBase):
    entries: dict[str, Any] = Field(default_factory=dict)


class LorebookPatch(AppModel):
    name: str | None = None
    description: str | None = None
    scan_depth: int | None = None
    token_budget: int | None = None
    entries: dict[str, Any] | None = None


class LorebookRead(LorebookBase):
    id: int
    entries: dict[str, EntryRead]


LorebookEntryMap = dict[str, EntryRead]
