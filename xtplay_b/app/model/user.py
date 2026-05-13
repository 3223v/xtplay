from __future__ import annotations

from enum import Enum

from pydantic import Field

from app.model.common import AppModel


class UserRole(str, Enum):
    NORMAL = "normal"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


class UserPublic(AppModel):
    id: int
    username: str
    email: str = ""
    role: str = UserRole.NORMAL.value


class UserCredentials(AppModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class UserRegister(UserCredentials):
    email: str = Field(default="", max_length=255)


class AuthResponse(AppModel):
    user: UserPublic


class UserUpdate(AppModel):
    username: str | None = None
    email: str | None = None
    password: str | None = None


class UserRoleUpdate(AppModel):
    role: UserRole
