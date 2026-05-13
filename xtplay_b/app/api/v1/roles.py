
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import PostgresCollection, ROLE_DEFAULTS
from app.model.role import RoleCreate, RolePatch, RoleRead, RoleReplace
from .dependencies import current_user_id, _not_found

router = APIRouter(prefix="/roles", tags=["roles"])

ROLE_STORE = PostgresCollection("roles", ROLE_DEFAULTS, unwrap_data=True)


@router.get("", response_model=list[RoleRead])
def list_roles(user_id: int = Depends(current_user_id)) -> list[dict]:
    return ROLE_STORE.list_all(user_id)


@router.get("/{item_id}", response_model=RoleRead)
def get_role(item_id: int, user_id: int = Depends(current_user_id)) -> dict:
    item = ROLE_STORE.get(user_id, item_id)
    if item is None:
        raise _not_found("role", item_id)
    return item


@router.post("", status_code=status.HTTP_201_CREATED, response_model=RoleRead)
def create_role(payload: RoleCreate, user_id: int = Depends(current_user_id)) -> dict:
    return ROLE_STORE.create(user_id, payload.model_dump(mode="json"))


@router.put("/{item_id}", response_model=RoleRead)
def replace_role(item_id: int, payload: RoleReplace, user_id: int = Depends(current_user_id)) -> dict:
    item = ROLE_STORE.replace(user_id, item_id, payload.model_dump(mode="json"))
    if item is None:
        raise _not_found("role", item_id)
    return item


@router.patch("/{item_id}", response_model=RoleRead)
def patch_role(item_id: int, payload: RolePatch, user_id: int = Depends(current_user_id)) -> dict:
    item = ROLE_STORE.patch(user_id, item_id, payload.model_dump(mode="json", exclude_unset=True))
    if item is None:
        raise _not_found("role", item_id)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(item_id: int, user_id: int = Depends(current_user_id)) -> None:
    if not ROLE_STORE.delete(user_id, item_id):
        raise _not_found("role", item_id)

