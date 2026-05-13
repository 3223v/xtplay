
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import PostgresPromptStore
from app.model.prompt import PromptPatch, PromptRead, PromptReplace
from app.services.prompt_registry import load_prompt_cache
from .dependencies import require_admin

router = APIRouter(prefix="/prompts", tags=["prompts"])


@router.get("", response_model=list[PromptRead])
def list_prompts(_: dict = Depends(require_admin)) -> list[dict]:
    prompt_store = PostgresPromptStore()
    return prompt_store.list_all()


@router.get("/{prompt_key}", response_model=PromptRead)
def get_prompt_item(prompt_key: str, _: dict = Depends(require_admin)) -> dict:
    prompt_store = PostgresPromptStore()
    item = prompt_store.get(prompt_key)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"prompt {prompt_key} not found")
    return item


@router.put("/{prompt_key}", response_model=PromptRead)
def replace_prompt_item(prompt_key: str, payload: PromptReplace, _: dict = Depends(require_admin)) -> dict:
    prompt_store = PostgresPromptStore()
    item = prompt_store.replace(prompt_key, payload.model_dump(mode="json"))
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"prompt {prompt_key} not found")
    load_prompt_cache(prompt_store)
    return item


@router.patch("/{prompt_key}", response_model=PromptRead)
def patch_prompt_item(prompt_key: str, payload: PromptPatch, _: dict = Depends(require_admin)) -> dict:
    prompt_store = PostgresPromptStore()
    item = prompt_store.patch(prompt_key, payload.model_dump(mode="json", exclude_unset=True))
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"prompt {prompt_key} not found")
    load_prompt_cache(prompt_store)
    return item


@router.post("/reload", response_model=list[PromptRead])
def reload_prompts(_: dict = Depends(require_admin)) -> list[dict]:
    prompt_store = PostgresPromptStore()
    load_prompt_cache(prompt_store)
    return prompt_store.list_all()

