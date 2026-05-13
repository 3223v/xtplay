
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import PostgresUserStore
from app.model.user import AuthResponse, UserCredentials, UserPublic, UserRegister, UserRole, UserUpdate
from .dependencies import require_admin, current_user_id, current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=AuthResponse)
def register(payload: UserRegister) -> dict:
    user_store = PostgresUserStore()
    try:
        user = user_store.create(payload.username, payload.password, payload.email)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"user": user}


@router.post("/login", response_model=AuthResponse)
def login(payload: UserCredentials) -> dict:
    user_store = PostgresUserStore()
    user = user_store.authenticate(payload.username.strip(), payload.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    return {"user": user}


@router.get("/users", response_model=list[UserPublic])
def list_users(_: dict = Depends(require_admin)) -> list:
    user_store = PostgresUserStore()
    return user_store.list_all()


@router.get("/users/{user_id}", response_model=UserPublic)
def get_user(user_id: int, _: dict = Depends(require_admin)) -> dict:
    user_store = PostgresUserStore()
    user = user_store.get(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/users/{user_id}", response_model=UserPublic)
def update_user(user_id: int, payload: UserUpdate, current: dict = Depends(require_admin)) -> dict:
    user_store = PostgresUserStore()
    target = user_store.get_full(user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    # Super admin can only modify themselves
    if target["role"] == UserRole.SUPER_ADMIN.value and int(target["id"]) != int(current["id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin info can only be modified by the user themselves")
    try:
        updated = user_store.update(user_id, payload.model_dump(mode="json", exclude_unset=True))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return updated


@router.put("/users/{user_id}/role", response_model=UserPublic)
def update_user_role(user_id: int, payload: UserRoleUpdate, current: dict = Depends(require_admin)) -> dict:
    user_store = PostgresUserStore()
    target = user_store.get_full(user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    # Super admin role cannot be modified by others
    if target["role"] == UserRole.SUPER_ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin role cannot be modified")
    try:
        updated = user_store.update_role(user_id, payload.role.value)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return updated


@router.patch("/me", response_model=UserPublic)
def update_me(payload: UserUpdate, user_id: int = Depends(current_user_id)) -> dict:
    user_store = PostgresUserStore()
    try:
        updated = user_store.update(user_id, payload.model_dump(mode="json", exclude_unset=True))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return updated

