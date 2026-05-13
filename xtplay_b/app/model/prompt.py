from __future__ import annotations

from pydantic import Field

from app.model.common import AppModel


class PromptBase(AppModel):
    title: str = Field(default="", max_length=128)
    category: str = Field(default="", max_length=64)
    description: str = ""
    content: str = ""


class PromptReplace(PromptBase):
    pass


class PromptPatch(AppModel):
    title: str | None = Field(default=None, max_length=128)
    category: str | None = Field(default=None, max_length=64)
    description: str | None = None
    content: str | None = None


class PromptRead(PromptBase):
    key: str
    created_at: str = ""
    updated_at: str = ""
