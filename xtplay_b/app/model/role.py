from __future__ import annotations

from typing import Any

from pydantic import Field, model_validator

from app.model.common import AppModel, empty_list


class RoleBase(AppModel):
    spec: str = ""
    name: str = ""
    description: str = ""
    personality: str = ""
    first_mes: str = ""
    avatar: str = ""
    mes_example: str = ""
    scenario: str = ""
    creator_notes: str = ""
    system_prompt: str = ""
    post_history_instructions: str = ""
    alternate_greetings: list[str] = Field(default_factory=empty_list)
    tags: list[str] = Field(default_factory=empty_list)

    @model_validator(mode="before")
    @classmethod
    def unwrap_data_card(cls, value: Any) -> Any:
        if isinstance(value, dict) and isinstance(value.get("data"), dict):
            return {"spec": value.get("spec", ""), **value["data"]}
        return value


class RoleCreate(RoleBase):
    pass


class RoleReplace(RoleBase):
    pass


class RolePatch(AppModel):
    spec: str | None = None
    name: str | None = None
    description: str | None = None
    personality: str | None = None
    first_mes: str | None = None
    avatar: str | None = None
    mes_example: str | None = None
    scenario: str | None = None
    creator_notes: str | None = None
    system_prompt: str | None = None
    post_history_instructions: str | None = None
    alternate_greetings: list[str] | None = None
    tags: list[str] | None = None

    @model_validator(mode="before")
    @classmethod
    def unwrap_data_card(cls, value: Any) -> Any:
        if isinstance(value, dict) and isinstance(value.get("data"), dict):
            return {"spec": value.get("spec", ""), **value["data"]}
        return value


class RoleRead(RoleBase):
    id: int
