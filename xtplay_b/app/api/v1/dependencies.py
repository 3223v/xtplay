
from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header, HTTPException, status

from app.db import PostgresUserStore


def current_user_id(x_user_id: Annotated[int | None, Header(alias="X-User-Id")] = None) -> int:
    if x_user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Please login first")
    user_store = PostgresUserStore()
    if user_store.get(x_user_id) is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User does not exist")
    return int(x_user_id)


def current_user(user_id: int = Depends(current_user_id)) -> dict:
    user_store = PostgresUserStore()
    user = user_store.get_full(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User does not exist")
    return user


def require_admin(user: dict = Depends(current_user)) -> dict:
    from app.model.user import UserRole

    if user.get("role") not in (UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions, admin access required")
    return user


def _not_found(resource: str, item_id: int) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{resource} {item_id} not found")

