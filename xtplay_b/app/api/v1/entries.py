
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import PostgresCollection, ENTRY_DEFAULTS
from app.model.entry import EntryCreate, EntryPatch, EntryRead, EntryReplace
from .dependencies import current_user_id, _not_found

router = APIRouter(prefix="/entries", tags=["entries"])

ENTRY_STORE = PostgresCollection("entries", ENTRY_DEFAULTS)


@router.get("", response_model=list[EntryRead])
def list_entries(user_id: int = Depends(current_user_id)) -> list[dict]:
    return ENTRY_STORE.list_all(user_id)


@router.get("/{item_id}", response_model=EntryRead)
def get_entry(item_id: int, user_id: int = Depends(current_user_id)) -> dict:
    item = ENTRY_STORE.get(user_id, item_id)
    if item is None:
        raise _not_found("entry", item_id)
    return item


@router.post("", status_code=status.HTTP_201_CREATED, response_model=EntryRead)
def create_entry(payload: EntryCreate, user_id: int = Depends(current_user_id)) -> dict:
    return ENTRY_STORE.create(user_id, payload.model_dump(mode="json"))


@router.put("/{item_id}", response_model=EntryRead)
def replace_entry(item_id: int, payload: EntryReplace, user_id: int = Depends(current_user_id)) -> dict:
    item = ENTRY_STORE.replace(user_id, item_id, payload.model_dump(mode="json"))
    if item is None:
        raise _not_found("entry", item_id)
    return item


@router.patch("/{item_id}", response_model=EntryRead)
def patch_entry(item_id: int, payload: EntryPatch, user_id: int = Depends(current_user_id)) -> dict:
    item = ENTRY_STORE.patch(user_id, item_id, payload.model_dump(mode="json", exclude_unset=True))
    if item is None:
        raise _not_found("entry", item_id)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(item_id: int, user_id: int = Depends(current_user_id)) -> None:
    if not ENTRY_STORE.delete(user_id, item_id):
        raise _not_found("entry", item_id)

