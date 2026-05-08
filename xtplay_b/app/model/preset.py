from __future__ import annotations

from pydantic import Field

from app.model.common import AppModel


class PresetBase(AppModel):
    temperature: float = 0.75
    frequency_penalty: float = 0.8
    presence_penalty: float = 0.8
    top_p: float = 0.99
    top_k: int = 75
    top_a: int = 0
    min_p: float = 0.1
    repetition_penalty: float = 1.1
    names_in_completion: bool = True
    main_prompt: str = ""
    impersonation_prompt: str = ""
    assistant_prefill: str = ""
    jailbreak_prompt: str = ""


class PresetCreate(PresetBase):
    pass


class PresetReplace(PresetBase):
    pass


class PresetPatch(AppModel):
    temperature: float | None = None
    frequency_penalty: float | None = None
    presence_penalty: float | None = None
    top_p: float | None = None
    top_k: int | None = None
    top_a: int | None = None
    min_p: float | None = None
    repetition_penalty: float | None = None
    names_in_completion: bool | None = None
    main_prompt: str | None = None
    impersonation_prompt: str | None = None
    assistant_prefill: str | None = None
    jailbreak_prompt: str | None = None


class PresetRead(PresetBase):
    id: int
