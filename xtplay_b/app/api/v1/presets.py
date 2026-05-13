
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import PostgresCollection, PRESET_DEFAULTS
from app.model.preset import PresetCreate, PresetPatch, PresetRead, PresetReplace
from .dependencies import current_user_id, _not_found

router = APIRouter(prefix="/presets", tags=["presets"])

PRESET_STORE = PostgresCollection("presets", PRESET_DEFAULTS)


@router.get("", response_model=list[PresetRead])
def list_presets(user_id: int = Depends(current_user_id)) -> list[dict]:
    return PRESET_STORE.list_all(user_id)


@router.get("/{item_id}", response_model=PresetRead)
def get_preset(item_id: int, user_id: int = Depends(current_user_id)) -> dict:
    item = PRESET_STORE.get(user_id, item_id)
    if item is None:
        raise _not_found("preset", item_id)
    return item


@router.post("", status_code=status.HTTP_201_CREATED, response_model=PresetRead)
def create_preset(payload: PresetCreate, user_id: int = Depends(current_user_id)) -> dict:
    return PRESET_STORE.create(user_id, payload.model_dump(mode="json"))


@router.put("/{item_id}", response_model=PresetRead)
def replace_preset(item_id: int, payload: PresetReplace, user_id: int = Depends(current_user_id)) -> dict:
    item = PRESET_STORE.replace(user_id, item_id, payload.model_dump(mode="json"))
    if item is None:
        raise _not_found("preset", item_id)
    return item


@router.patch("/{item_id}", response_model=PresetRead)
def patch_preset(item_id: int, payload: PresetPatch, user_id: int = Depends(current_user_id)) -> dict:
    item = PRESET_STORE.patch(user_id, item_id, payload.model_dump(mode="json", exclude_unset=True))
    if item is None:
        raise _not_found("preset", item_id)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_preset(item_id: int, user_id: int = Depends(current_user_id)) -> None:
    if not PRESET_STORE.delete(user_id, item_id):
        raise _not_found("preset", item_id)

