
from __future__ import annotations

from copy import deepcopy
from typing import Dict, Any

from psycopg.types.json import Jsonb

from .base import connect, _coerce_int, _coerce_float, _coerce_bool, _coerce_string_list, _coerce_by_default
from .base import _iso, _now_iso, _format_output


class PostgresStoryCollection:
    def list_all(self, user_id: int) -> list:
        with connect() as conn:
            rows = conn.execute(
                """
                select id, user_id, data, created_at, updated_at
                from stories
                where user_id = %s
                order by id
                """,
                (user_id,),
            ).fetchall()
            return [self._row_to_story(row) for row in rows]

    def get(self, user_id: int, story_id: int) -> Any:
        with connect() as conn:
            row = conn.execute(
                """
                select id, user_id, data, created_at, updated_at
                from stories
                where id = %s and user_id = %s
                """,
                (story_id, user_id),
            ).fetchone()
            return self._row_to_story(row) if row is not None else None

    def create(self, user_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(payload, dict):
            raise TypeError("payload must be a JSON object")
        data = self._story_data_for_storage(payload)
        with connect() as conn:
            row = conn.execute(
                """
                insert into stories (user_id, data)
                values (%s, %s)
                returning id, user_id, data, created_at, updated_at
                """,
                (user_id, Jsonb(data)),
            ).fetchone()
            return self._row_to_story(row)

    def replace(self, user_id: int, story_id: int, payload: Dict[str, Any]) -> Any:
        if not isinstance(payload, dict):
            raise TypeError("payload must be a JSON object")
        data = self._story_data_for_storage(payload)
        with connect() as conn:
            row = conn.execute(
                """
                update stories
                set data = %s, updated_at = now()
                where id = %s and user_id = %s
                returning id, user_id, data, created_at, updated_at
                """,
                (Jsonb(data), story_id, user_id),
            ).fetchone()
            if row is None:
                return None
            return self._row_to_story(row)

    def patch(self, user_id: int, story_id: int, payload: Dict[str, Any]) -> Any:
        if not isinstance(payload, dict):
            raise TypeError("payload must be a JSON object")
        current = self.get(user_id, story_id)
        if current is None:
            return None
        patched = deepcopy(current)
        for key, value in payload.items():
            if key not in {"id", "created_at", "updated_at"}:
                patched[key] = value
        data = self._story_data_for_storage(patched)
        with connect() as conn:
            row = conn.execute(
                """
                update stories
                set data = %s, updated_at = now()
                where id = %s and user_id = %s
                returning id, user_id, data, created_at, updated_at
                """,
                (Jsonb(data), story_id, user_id),
            ).fetchone()
            if row is None:
                return None
            return self._row_to_story(row)

    def delete(self, user_id: int, story_id: int) -> bool:
        with connect() as conn:
            cursor = conn.execute(
                "delete from stories where id = %s and user_id = %s",
                (story_id, user_id),
            )
        return cursor.rowcount > 0

    def list_rounds(self, user_id: int, story_id: int) -> Any:
        if not self._story_exists(user_id, story_id):
            return None
        with connect() as conn:
            return self._list_rounds(conn, user_id, story_id)

    def get_round(self, user_id: int, story_id: int, round_id: int) -> Any:
        with connect() as conn:
            row = conn.execute(
                """
                select id, data
                from story_rounds
                where id = %s and story_id = %s and user_id = %s
                """,
                (round_id, story_id, user_id),
            ).fetchone()
        return self._row_to_round(row) if row is not None else None

    def create_round(self, user_id: int, story_id: int, payload: Dict[str, Any]) -> Any:
        if not self._story_exists(user_id, story_id):
            return None
        with connect() as conn:
            position = self._next_round_position(conn, user_id, story_id)
            round_item = self._insert_round(conn, user_id, story_id, payload, position)
            conn.execute(
                "update stories set updated_at = now() where id = %s and user_id = %s",
                (story_id, user_id),
            )
        return round_item

    def replace_round(
        self,
        user_id: int,
        story_id: int,
        round_id: int,
        payload: Dict[str, Any],
    ) -> Any:
        if not isinstance(payload, dict):
            raise TypeError("payload must be a JSON object")
        data = self._round_data_for_storage(payload)
        with connect() as conn:
            row = conn.execute(
                """
                update story_rounds
                set data = %s, updated_at = now()
                where id = %s and story_id = %s and user_id = %s
                returning id, data
                """,
                (Jsonb(data), round_id, story_id, user_id),
            ).fetchone()
            if row is None:
                return None
            conn.execute(
                "update stories set updated_at = now() where id = %s and user_id = %s",
                (story_id, user_id),
            )
        return self._row_to_round(row)

    def patch_round(
        self,
        user_id: int,
        story_id: int,
        round_id: int,
        payload: Dict[str, Any],
    ) -> Any:
        if not isinstance(payload, dict):
            raise TypeError("payload must be a JSON object")
        current = self.get_round(user_id, story_id, round_id)
        if current is None:
            return None
        patched = deepcopy(current)
        for key, value in payload.items():
            if key != "id":
                patched[key] = value
        data = self._round_data_for_storage(patched)
        with connect() as conn:
            row = conn.execute(
                """
                update story_rounds
                set data = %s, updated_at = now()
                where id = %s and story_id = %s and user_id = %s
                returning id, data
                """,
                (Jsonb(data), round_id, story_id, user_id),
            ).fetchone()
            if row is None:
                return None
            conn.execute(
                "update stories set updated_at = now() where id = %s and user_id = %s",
                (story_id, user_id),
            )
        return self._row_to_round(row)

    def delete_round(self, user_id: int, story_id: int, round_id: int) -> bool:
        with connect() as conn:
            cursor = conn.execute(
                """
                delete from story_rounds
                where id = %s and story_id = %s and user_id = %s
                """,
                (round_id, story_id, user_id),
            )
            deleted = cursor.rowcount > 0
            if deleted:
                conn.execute(
                    "update stories set updated_at = now() where id = %s and user_id = %s",
                    (story_id, user_id),
                )
        return deleted

    def _story_exists(self, user_id: int, story_id: int) -> bool:
        with connect() as conn:
            row = conn.execute(
                "select id from stories where id = %s and user_id = %s",
                (story_id, user_id),
            ).fetchone()
        return row is not None

    def _row_to_story(self, row: Dict[str, Any]) -> Dict[str, Any]:
        data = dict(row.get("data") or {})
        return {
            "id": int(row["id"]),
            **data,
            "created_at": _iso(row.get("created_at")) or _now_iso(),
            "updated_at": _iso(row.get("updated_at")) or _now_iso(),
        }

    def _list_rounds(self, conn: Any, user_id: int, story_id: int) -> list:
        rows = conn.execute(
            """
            select id, data
            from story_rounds
            where user_id = %s and story_id = %s
            order by position, id
            """,
            (user_id, story_id),
        ).fetchall()
        return [self._row_to_round(row) for row in rows]

    def _insert_round(
        self,
        conn: Any,
        user_id: int,
        story_id: int,
        payload: Dict[str, Any],
        position: int,
    ) -> Dict[str, Any]:
        data = self._round_data_for_storage(payload)
        row = conn.execute(
            """
            insert into story_rounds (user_id, story_id, position, data)
            values (%s, %s, %s, %s)
            returning id, data
            """,
            (user_id, story_id, position, Jsonb(data)),
        ).fetchone()
        return self._row_to_round(row)

    def _next_round_position(self, conn: Any, user_id: int, story_id: int) -> int:
        row = conn.execute(
            """
            select coalesce(max(position), 0) + 1 as next_position
            from story_rounds
            where user_id = %s and story_id = %s
            """,
            (user_id, story_id),
        ).fetchone()
        return int(row["next_position"])

    def _story_data_for_storage(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        data = deepcopy(payload)
        for key in ("id", "created_at", "updated_at"):
            data.pop(key, None)
        return data

    def _round_data_for_storage(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(payload, dict):
            raise TypeError("payload must be a JSON object")
        round_item = deepcopy(payload)
        round_item.pop("id", None)
        self._normalize_round_shape(round_item)
        return round_item

    def _row_to_round(self, row: Dict[str, Any]) -> Dict[str, Any]:
        round_item = dict(row.get("data") or {})
        round_item["id"] = int(row["id"])
        self._normalize_round_shape(round_item)
        return round_item

    def _normalize_round_shape(self, round_item: Dict[str, Any]) -> None:
        round_item.setdefault("scene", "")
        round_item.setdefault("narration", "")
        first = round_item.get("first")
        round_item["first"] = first if first in {"role1", "role2"} else "role1"
        round_item.setdefault("next_scene", "")
        round_item.setdefault("next_narration", "")
        next_first = round_item.get("next_first")
        round_item["next_first"] = next_first if next_first in {"role1", "role2"} else "role1"
        for role_key in ("role1", "role2"):
            action_key = f"{role_key}_action"
            dialogue_key = f"{role_key}_dialogue"
            output_key = f"{role_key}_output"
            round_item.setdefault(action_key, "")
            round_item.setdefault(dialogue_key, "")
            if not round_item.get(output_key):
                round_item[output_key] = _format_output(
                    round_item.get(action_key, ""),
                    round_item.get(dialogue_key, ""),
                )
            elif not round_item.get(action_key) and not round_item.get(dialogue_key):
                round_item[output_key] = str(round_item.get(output_key, ""))


class PostgresSessionStore:
    def list_by_story(self, user_id: int, story_id: int) -> list:
        with connect() as conn:
            rows = conn.execute(
                """
                select id, user_id, story_id, data, created_at, updated_at
                from story_sessions
                where user_id = %s and story_id = %s
                order by id
                """,
                (user_id, story_id),
            ).fetchall()
            return [self._row_to_session(conn, row) for row in rows]

    def get(self, user_id: int, session_id: int) -> Any:
        with connect() as conn:
            row = conn.execute(
                """
                select id, user_id, story_id, data, created_at, updated_at
                from story_sessions
                where id = %s and user_id = %s
                """,
                (session_id, user_id),
            ).fetchone()
            return self._row_to_session(conn, row) if row is not None else None

    def create(self, user_id: int, story_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(payload, dict):
            raise TypeError("payload must be a JSON object")
        data = self._session_data_for_storage(payload)
        with connect() as conn:
            row = conn.execute(
                """
                insert into story_sessions (user_id, story_id, data)
                values (%s, %s, %s)
                returning id, user_id, story_id, data, created_at, updated_at
                """,
                (user_id, story_id, Jsonb(data)),
            ).fetchone()
            return self._row_to_session(conn, row)

    def update(self, user_id: int, session_id: int, payload: Dict[str, Any]) -> Any:
        if not isinstance(payload, dict):
            raise TypeError("payload must be a JSON object")
        current = self.get(user_id, session_id)
        if current is None:
            return None
        patched = deepcopy(current)
        for key, value in payload.items():
            if key not in {"id", "story_id", "created_at", "updated_at", "round"}:
                patched[key] = value
        data = self._session_data_for_storage(patched)
        with connect() as conn:
            row = conn.execute(
                """
                update story_sessions
                set data = %s, updated_at = now()
                where id = %s and user_id = %s
                returning id, user_id, story_id, data, created_at, updated_at
                """,
                (Jsonb(data), session_id, user_id),
            ).fetchone()
            return self._row_to_session(conn, row) if row is not None else None

    def delete(self, user_id: int, session_id: int) -> bool:
        with connect() as conn:
            cursor = conn.execute(
                "delete from story_sessions where id = %s and user_id = %s",
                (session_id, user_id),
            )
        return cursor.rowcount > 0

    def list_rounds(self, user_id: int, session_id: int) -> list:
        with connect() as conn:
            return self._list_rounds(conn, user_id, session_id)

    def get_round(self, user_id: int, session_id: int, round_id: int) -> Any:
        with connect() as conn:
            row = conn.execute(
                """
                select id, data
                from session_rounds
                where id = %s and session_id = %s and user_id = %s
                """,
                (round_id, session_id, user_id),
            ).fetchone()
        return self._row_to_round(row) if row is not None else None

    def create_round(self, user_id: int, session_id: int, payload: Dict[str, Any]) -> Any:
        if not self._session_exists(user_id, session_id):
            return None
        with connect() as conn:
            position = self._next_round_position(conn, user_id, session_id)
            new_round = self._insert_round(conn, user_id, session_id, payload, position)
            conn.execute(
                "update story_sessions set updated_at = now() where id = %s and user_id = %s",
                (session_id, user_id),
            )
        return new_round

    def replace_round(self, user_id: int, session_id: int, round_id: int, payload: Dict[str, Any]) -> Any:
        if not isinstance(payload, dict):
            raise TypeError("payload must be a JSON object")
        data = self._round_data_for_storage(payload)
        with connect() as conn:
            row = conn.execute(
                """
                update session_rounds
                set data = %s, updated_at = now()
                where id = %s and session_id = %s and user_id = %s
                returning id, data
                """,
                (Jsonb(data), round_id, session_id, user_id),
            ).fetchone()
            if row is None:
                return None
            conn.execute(
                "update story_sessions set updated_at = now() where id = %s and user_id = %s",
                (session_id, user_id),
            )
        return self._row_to_round(row)

    def patch_round(self, user_id: int, session_id: int, round_id: int, payload: Dict[str, Any]) -> Any:
        if not isinstance(payload, dict):
            raise TypeError("payload must be a JSON object")
        current = self.get_round(user_id, session_id, round_id)
        if current is None:
            return None
        patched = deepcopy(current)
        for key, value in payload.items():
            if key != "id":
                patched[key] = value
        data = self._round_data_for_storage(patched)
        with connect() as conn:
            row = conn.execute(
                """
                update session_rounds
                set data = %s, updated_at = now()
                where id = %s and session_id = %s and user_id = %s
                returning id, data
                """,
                (Jsonb(data), round_id, session_id, user_id),
            ).fetchone()
            if row is None:
                return None
            conn.execute(
                "update story_sessions set updated_at = now() where id = %s and user_id = %s",
                (session_id, user_id),
            )
        return self._row_to_round(row)

    def delete_round(self, user_id: int, session_id: int, round_id: int) -> bool:
        with connect() as conn:
            cursor = conn.execute(
                """
                delete from session_rounds
                where id = %s and session_id = %s and user_id = %s
                """,
                (round_id, session_id, user_id),
            )
            deleted = cursor.rowcount > 0
            if deleted:
                conn.execute(
                    "update story_sessions set updated_at = now() where id = %s and user_id = %s",
                    (session_id, user_id),
                )
        return deleted

    def _session_exists(self, user_id: int, session_id: int) -> bool:
        with connect() as conn:
            row = conn.execute(
                "select id from story_sessions where id = %s and user_id = %s",
                (session_id, user_id),
            ).fetchone()
        return row is not None

    def _row_to_session(self, conn: Any, row: Dict[str, Any]) -> Dict[str, Any]:
        data = dict(row.get("data") or {})
        session: Dict[str, Any] = {
            "id": int(row["id"]),
            "story_id": int(row["story_id"]),
            "title": str(data.get("title", "") or ""),
            "status": str(data.get("status", "active") or "active"),
            "round": self._list_rounds(conn, int(row["user_id"]), int(row["id"])),
            "created_at": _iso(row.get("created_at")) or _now_iso(),
            "updated_at": _iso(row.get("updated_at")) or _now_iso(),
        }
        return session

    def _list_rounds(self, conn: Any, user_id: int, session_id: int) -> list:
        rows = conn.execute(
            """
            select id, data
            from session_rounds
            where user_id = %s and session_id = %s
            order by position, id
            """,
            (user_id, session_id),
        ).fetchall()
        return [self._row_to_round(row) for row in rows]

    def _insert_round(
        self,
        conn: Any,
        user_id: int,
        session_id: int,
        payload: Dict[str, Any],
        position: int,
    ) -> Dict[str, Any]:
        data = self._round_data_for_storage(payload)
        row = conn.execute(
            """
            insert into session_rounds (user_id, session_id, position, data)
            values (%s, %s, %s, %s)
            returning id, data
            """,
            (user_id, session_id, position, Jsonb(data)),
        ).fetchone()
        return self._row_to_round(row)

    def _next_round_position(self, conn: Any, user_id: int, session_id: int) -> int:
        row = conn.execute(
            """
            select coalesce(max(position), 0) + 1 as next_position
            from session_rounds
            where user_id = %s and session_id = %s
            """,
            (user_id, session_id),
        ).fetchone()
        return int(row["next_position"])

    def _session_data_for_storage(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        data = deepcopy(payload)
        for key in ("id", "story_id", "created_at", "updated_at", "round"):
            data.pop(key, None)
        return data

    def _round_data_for_storage(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(payload, dict):
            raise TypeError("payload must be a JSON object")
        round_item = deepcopy(payload)
        round_item.pop("id", None)
        self._normalize_round_shape(round_item)
        return round_item

    def _row_to_round(self, row: Dict[str, Any]) -> Dict[str, Any]:
        round_item = dict(row.get("data") or {})
        round_item["id"] = int(row["id"])
        self._normalize_round_shape(round_item)
        return round_item

    def _normalize_round_shape(self, round_item: Dict[str, Any]) -> None:
        round_item.setdefault("scene", "")
        round_item.setdefault("narration", "")
        first = round_item.get("first")
        round_item["first"] = first if first in {"role1", "role2"} else "role1"
        round_item.setdefault("next_scene", "")
        round_item.setdefault("next_narration", "")
        next_first = round_item.get("next_first")
        round_item["next_first"] = next_first if next_first in {"role1", "role2"} else "role1"
        for role_key in ("role1", "role2"):
            action_key = f"{role_key}_action"
            dialogue_key = f"{role_key}_dialogue"
            output_key = f"{role_key}_output"
            round_item.setdefault(action_key, "")
            round_item.setdefault(dialogue_key, "")
            if not round_item.get(output_key):
                round_item[output_key] = _format_output(
                    round_item.get(action_key, ""),
                    round_item.get(dialogue_key, ""),
                )
            elif not round_item.get(action_key) and not round_item.get(dialogue_key):
                round_item[output_key] = str(round_item.get(output_key, ""))

