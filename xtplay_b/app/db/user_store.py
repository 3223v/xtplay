
from __future__ import annotations

from typing import Dict, Any

from .base import connect


def _public_user(user: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": int(user["id"]),
        "username": str(user["username"]),
        "email": str(user.get("email", "")),
        "role": str(user.get("role", "normal")),
    }


class PostgresUserStore:
    def list_all(self) -> list:
        with connect() as conn:
            rows = conn.execute("select id, username, email, role from users order by id").fetchall()
        return [_public_user(row) for row in rows]

    def get(self, user_id: int) -> Any:
        with connect() as conn:
            row = conn.execute(
                "select id, username, email, role from users where id = %s",
                (user_id,),
            ).fetchone()
        return _public_user(row) if row is not None else None

    def get_full(self, user_id: int) -> Any:
        with connect() as conn:
            row = conn.execute(
                "select id, username, password, email, role from users where id = %s",
                (user_id,),
            ).fetchone()
        return dict(row) if row is not None else None

    def get_by_username(self, username: str) -> Any:
        clean_username = username.strip()
        if not clean_username:
            return None
        with connect() as conn:
            row = conn.execute(
                "select id, username, password, email, role from users where lower(username) = lower(%s)",
                (clean_username,),
            ).fetchone()
        return dict(row) if row is not None else None

    def create(self, username: str, password: str, email: str = "") -> Dict[str, Any]:
        clean_username = username.strip()
        clean_password = password.strip()
        clean_email = email.strip()
        if not clean_username:
            raise ValueError("用户名不能为空")
        if not clean_password:
            raise ValueError("密码不能为空")
        if self.get_by_username(clean_username) is not None:
            raise ValueError("用户名已存在")

        with connect() as conn:
            row = conn.execute(
                """
                insert into users (username, password, email, role)
                values (%s, %s, %s, %s)
                returning id, username, email, role
                """,
                (clean_username, clean_password, clean_email, "normal"),
            ).fetchone()
        return _public_user(row)

    def authenticate(self, username: str, password: str) -> Any:
        user = self.get_by_username(username)
        if user is None or user.get("password") != password:
            return None
        return _public_user(user)

    def update(self, user_id: int, payload: Dict[str, Any]) -> Any:
        current = self.get(user_id)
        if current is None:
            return None
        set_clauses = []
        params = []
        if "username" in payload and payload["username"] is not None:
            clean_username = str(payload["username"]).strip()
            if clean_username and clean_username != current["username"]:
                existing = self.get_by_username(clean_username)
                if existing is not None and int(existing["id"]) != user_id:
                    raise ValueError("用户名已存在")
            set_clauses.append("username = %s")
            params.append(clean_username)
        if "email" in payload and payload["email"] is not None:
            set_clauses.append("email = %s")
            params.append(str(payload["email"]).strip())
        if "password" in payload and payload["password"] is not None:
            clean_password = str(payload["password"]).strip()
            if clean_password:
                set_clauses.append("password = %s")
                params.append(clean_password)
        if not set_clauses:
            return current
        set_clauses.append("updated_at = now()")
        params.append(user_id)
        with connect() as conn:
            row = conn.execute(
                f"update users set {', '.join(set_clauses)} where id = %s returning id, username, email, role",
                params,
            ).fetchone()
        return _public_user(row) if row is not None else None

    def update_role(self, user_id: int, role: str) -> Any:
        if role not in ("normal", "admin", "super_admin"):
            raise ValueError("无效的角色值")
        with connect() as conn:
            row = conn.execute(
                "update users set role = %s, updated_at = now() where id = %s returning id, username, email, role",
                (role, user_id),
            ).fetchone()
        return _public_user(row) if row is not None else None

