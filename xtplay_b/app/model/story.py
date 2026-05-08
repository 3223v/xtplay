from __future__ import annotations

from typing import Any

from pydantic import Field

from app.model.common import AppModel, empty_list


class StoryRound(AppModel):
    id: int = 0
    scene: str = ""
    narration: str = ""
    first: str = "role1"
    next_scene: str = ""
    next_narration: str = ""
    next_first: str = "role1"
    role1_action: str = ""
    role1_dialogue: str = ""
    role1_output: str = ""
    role2_action: str = ""
    role2_dialogue: str = ""
    role2_output: str = ""


class StoryBase(AppModel):
    title: str = ""
    description: str = ""
    status: str = "active"
    url: str = ""
    api_key: str = ""
    model: str = ""
    tags: list[str] = Field(default_factory=empty_list)
    preset: dict[str, Any] = Field(default_factory=dict)
    lorebook: dict[str, Any] = Field(default_factory=dict)
    initial_scene: str = ""
    role1: dict[str, Any] = Field(default_factory=dict)
    role2: dict[str, Any] = Field(default_factory=dict)
    round: list[StoryRound] = Field(default_factory=empty_list)


class StoryCreate(StoryBase):
    pass


class StoryReplace(StoryBase):
    pass


class StoryPatch(AppModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    url: str | None = None
    api_key: str | None = None
    model: str | None = None
    tags: list[str] | None = None
    preset: dict[str, Any] | None = None
    lorebook: dict[str, Any] | None = None
    initial_scene: str | None = None
    role1: dict[str, Any] | None = None
    role2: dict[str, Any] | None = None
    round: list[StoryRound] | None = None


class StoryRead(StoryBase):
    id: int
    created_at: str = ""
    updated_at: str = ""
