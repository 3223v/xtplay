
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import PostgresLorebookCollection, LOREBOOK_DEFAULTS
from app.model.entry import EntryCreate, EntryPatch, EntryRead, EntryReplace
from app.model.lorebook import LorebookCreate, LorebookPatch, LorebookRead, LorebookReplace
from .dependencies import current_user_id, _not_found

router = APIRouter(prefix="/lorebooks", tags=["lorebooks"])

LOREBOOK_STORE = PostgresLorebookCollection("lorebooks", LOREBOOK_DEFAULTS)


@router.get("", response_model=list[LorebookRead])
def list_lorebooks(user_id: int = Depends(current_user_id)) -> list[dict]:
    return LOREBOOK_STORE.list_all(user_id)


@router.get("/{item_id}", response_model=LorebookRead)
def get_lorebook(item_id: int, user_id: int = Depends(current_user_id)) -> dict:
    item = LOREBOOK_STORE.get(user_id, item_id)
    if item is None:
        raise _not_found("lorebook", item_id)
    return item


@router.post("", status_code=status.HTTP_201_CREATED, response_model=LorebookRead)
def create_lorebook(payload: LorebookCreate, user_id: int = Depends(current_user_id)) -> dict:
    return LOREBOOK_STORE.create(user_id, payload.model_dump(mode="json"))


@router.put("/{item_id}", response_model=LorebookRead)
def replace_lorebook(item_id: int, payload: LorebookReplace, user_id: int = Depends(current_user_id)) -> dict:
    item = LOREBOOK_STORE.replace(user_id, item_id, payload.model_dump(mode="json"))
    if item is None:
        raise _not_found("lorebook", item_id)
    return item


@router.patch("/{item_id}", response_model=LorebookRead)
def patch_lorebook(item_id: int, payload: LorebookPatch, user_id: int = Depends(current_user_id)) -> dict:
    item = LOREBOOK_STORE.patch(user_id, item_id, payload.model_dump(mode="json", exclude_unset=True))
    if item is None:
        raise _not_found("lorebook", item_id)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lorebook(item_id: int, user_id: int = Depends(current_user_id)) -> None:
    if not LOREBOOK_STORE.delete(user_id, item_id):
        raise _not_found("lorebook", item_id)


@router.get("/{lorebook_id}/entries", response_model=list[EntryRead])
def list_lorebook_entries(lorebook_id: int, user_id: int = Depends(current_user_id)) -> list[dict]:
    entries = LOREBOOK_STORE.list_entries(user_id, lorebook_id)
    if entries is None:
        raise _not_found("lorebook", lorebook_id)
    return entries


@router.get("/{lorebook_id}/entries/{entry_id}", response_model=EntryRead)
def get_lorebook_entry(lorebook_id: int, entry_id: int, user_id: int = Depends(current_user_id)) -> dict:
    entry = LOREBOOK_STORE.get_entry(user_id, lorebook_id, entry_id)
    if entry is None:
        raise _not_found("entry", entry_id)
    return entry


@router.post("/{lorebook_id}/entries", status_code=status.HTTP_201_CREATED, response_model=EntryRead)
def create_lorebook_entry(lorebook_id: int, payload: EntryCreate, user_id: int = Depends(current_user_id)) -> dict:
    entry = LOREBOOK_STORE.create_entry(user_id, lorebook_id, payload.model_dump(mode="json"))
    if entry is None:
        raise _not_found("lorebook", lorebook_id)
    return entry


@router.put("/{lorebook_id}/entries/{entry_id}", response_model=EntryRead)
def replace_lorebook_entry(
    lorebook_id: int,
    entry_id: int,
    payload: EntryReplace,
    user_id: int = Depends(current_user_id),
) -> dict:
    entry = LOREBOOK_STORE.replace_entry(user_id, lorebook_id, entry_id, payload.model_dump(mode="json"))
    if entry is None:
        raise _not_found("entry", entry_id)
    return entry


@router.patch("/{lorebook_id}/entries/{entry_id}", response_model=EntryRead)
def patch_lorebook_entry(
    lorebook_id: int,
    entry_id: int,
    payload: EntryPatch,
    user_id: int = Depends(current_user_id),
) -> dict:
    entry = LOREBOOK_STORE.patch_entry(user_id, lorebook_id, entry_id, payload.model_dump(mode="json", exclude_unset=True))
    if entry is None:
        raise _not_found("entry", entry_id)
    return entry


@router.delete("/{lorebook_id}/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lorebook_entry(lorebook_id: int, entry_id: int, user_id: int = Depends(current_user_id)) -> None:
    if not LOREBOOK_STORE.delete_entry(user_id, lorebook_id, entry_id):
        raise _not_found("entry", entry_id)

