from __future__ import annotations

from pydantic import Field

from app.model.common import AppModel


class UserPublic(AppModel):
    id: int
    username: str
    email: str = ""


class UserCredentials(AppModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class UserRegister(UserCredentials):
    email: str = Field(default="", max_length=255)


class AuthResponse(AppModel):
    user: UserPublic
