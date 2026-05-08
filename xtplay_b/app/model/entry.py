from __future__ import annotations

from pydantic import Field

from app.model.common import AppModel, empty_list


class EntryBase(AppModel):
    uid: int = 0
    key: list[str] = Field(default_factory=empty_list)
    keysecondary: list[str] = Field(default_factory=empty_list)
    comment: str = ""
    content: str = ""
    order: int = 100


class EntryCreate(EntryBase):
    pass


class EntryReplace(EntryBase):
    pass


class EntryPatch(AppModel):
    uid: int | None = None
    key: list[str] | None = None
    keysecondary: list[str] | None = None
    comment: str | None = None
    content: str | None = None
    order: int | None = None


class EntryRead(EntryBase):
    id: int
