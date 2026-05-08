from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from threading import RLock
from typing import Any


class UserStore:
    def __init__(self, file_path: Path) -> None:
        self.file_path = file_path
        self._lock = RLock()
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.file_path.exists():
            self._write_raw([])

    def list_all(self) -> list[dict[str, Any]]:
        with self._lock:
            users = self._normalize_users(self._read_raw())
            self._write_raw(users)
            return [self._public_user(user) for user in users]

    def get_by_username(self, username: str) -> dict[str, Any] | None:
        target = username.strip().casefold()
        if not target:
            return None
        with self._lock:
            users = self._normalize_users(self._read_raw())
            self._write_raw(users)
            for user in users:
                if user["username"].casefold() == target:
                    return deepcopy(user)
            return None

    def create(self, username: str, password: str, email: str = "") -> dict[str, Any]:
        clean_username = username.strip()
        clean_password = password.strip()
        clean_email = email.strip()
        if not clean_username:
            raise ValueError("用户名不能为空")
        if not clean_password:
            raise ValueError("密码不能为空")

        with self._lock:
            users = self._normalize_users(self._read_raw())
            if any(user["username"].casefold() == clean_username.casefold() for user in users):
                raise ValueError("用户名已存在")
            created = {
                "id": self._next_id(users),
                "username": clean_username,
                "password": clean_password,
                "email": clean_email,
            }
            users.append(created)
            self._write_raw(users)
            return self._public_user(created)

    def authenticate(self, username: str, password: str) -> dict[str, Any] | None:
        user = self.get_by_username(username)
        if user is None:
            return None
        if user.get("password") != password:
            return None
        return self._public_user(user)

    def _normalize_users(self, raw: Any) -> list[dict[str, Any]]:
        source = raw if isinstance(raw, list) else []
        users: list[dict[str, Any]] = []
        next_id = self._next_id(source)
        for item in source:
            if not isinstance(item, dict):
                continue
            username = str(item.get("username", "")).strip()
            password = str(item.get("password", "")).strip()
            if not username or not password:
                continue
            item_id = self._coerce_int(item.get("id"))
            if item_id is None or item_id <= 0:
                item_id = next_id
                next_id += 1
            users.append(
                {
                    "id": item_id,
                    "username": username,
                    "password": password,
                    "email": str(item.get("email", "")).strip(),
                }
            )
        users.sort(key=lambda user: user["id"])
        return users

    def _public_user(self, user: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": int(user["id"]),
            "username": str(user["username"]),
            "email": str(user.get("email", "")),
        }

    def _next_id(self, users: list[Any]) -> int:
        max_id = 0
        for user in users:
            if not isinstance(user, dict):
                continue
            item_id = self._coerce_int(user.get("id"))
            if item_id is not None and item_id > max_id:
                max_id = item_id
        return max_id + 1

    def _coerce_int(self, value: Any) -> int | None:
        if isinstance(value, bool):
            return None
        if isinstance(value, int):
            return value
        if isinstance(value, str):
            text = value.strip()
            if not text:
                return None
            try:
                return int(text)
            except ValueError:
                return None
        return None

    def _read_raw(self) -> Any:
        if not self.file_path.exists():
            return []
        with self.file_path.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def _write_raw(self, data: Any) -> None:
        with self.file_path.open("w", encoding="utf-8") as handle:
            json.dump(data, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
