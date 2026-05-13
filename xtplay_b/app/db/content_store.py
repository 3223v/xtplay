
from __future__ import annotations

from copy import deepcopy
from typing import Dict, Any, Tuple, List

from psycopg.types.json import Jsonb

from .base import (
    connect,
    _coerce_int,
    _coerce_float,
    _coerce_bool,
    _coerce_string_list,
    _coerce_by_default,
    _iso,
    _now_iso,
    _format_output,
    ROLE_DEFAULTS,
    PRESET_DEFAULTS,
    ENTRY_DEFAULTS,
    LOREBOOK_DEFAULTS,
    CONTENT_TABLES,
)


class PostgresCollection:
    def __init__(
        self,
        table: str,
        defaults: Dict[str, Any] = None,
        unwrap_data: bool = False,
    ) -> None:
        if table not in CONTENT_TABLES:
            raise ValueError(f"unsupported table: {table}")
        self.table = table
        self.defaults = defaults
        self.unwrap_data = unwrap_data

    def list_all(self, user_id: int) -> list:
        with connect() as conn:
            rows = conn.execute(
                f"select id, data from {self.table} where user_id = %s order by id",
                (user_id,),
            ).fetchall()
        return [self._row_to_item(row) for row in rows]

    def get(self, user_id: int, item_id: int) -> Any:
        with connect() as conn:
            row = conn.execute(
                f"select id, data from {self.table} where id = %s and user_id = %s",
                (item_id, user_id),
            ).fetchone()
        return self._row_to_item(row) if row is not None else None

    def create(self, user_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(payload, dict):
            raise TypeError("payload must be a JSON object")
        data = self._shape_item(payload)
        with connect() as conn:
            row = conn.execute(
                f"insert into {self.table} (user_id, data) values (%s, %s) returning id, data",
                (user_id, Jsonb(data)),
            ).fetchone()
            item = self._row_to_item(row)
            self._save_item_data(conn, int(row["id"]), item)
        return item

    def replace(self, user_id: int, item_id: int, payload: Dict[str, Any]) -> Any:
        if not isinstance(payload, dict):
            raise TypeError("payload must be a JSON object")
        data = self._shape_item(payload)
        with connect() as conn:
            row = conn.execute(
                f"""
                update {self.table}
                set data = %s, updated_at = now()
                where id = %s and user_id = %s
                returning id, data
                """,
                (Jsonb(data), item_id, user_id),
            ).fetchone()
            if row is None:
                return None
            item = self._row_to_item(row)
            self._save_item_data(conn, int(row["id"]), item)
        return item

    def patch(self, user_id: int, item_id: int, payload: Dict[str, Any]) -> Any:
        if not isinstance(payload, dict):
            raise TypeError("payload must be a JSON object")
        current = self.get(user_id, item_id)
        if current is None:
            return None
        patched = deepcopy(current)
        for key, value in payload.items():
            if key != "id":
                patched[key] = value
        data = self._shape_item(patched)
        data["id"] = item_id
        self._ensure_uid(data)
        with connect() as conn:
            row = conn.execute(
                f"""
                update {self.table}
                set data = %s, updated_at = now()
                where id = %s and user_id = %s
                returning id, data
                """,
                (Jsonb(self._data_for_storage(data)), item_id, user_id),
            ).fetchone()
        return self._row_to_item(row) if row is not None else None

    def delete(self, user_id: int, item_id: int) -> bool:
        with connect() as conn:
            cursor = conn.execute(
                f"delete from {self.table} where id = %s and user_id = %s",
                (item_id, user_id),
            )
        return cursor.rowcount > 0

    def _save_item_data(self, conn: Any, item_id: int, item: Dict[str, Any]) -> None:
        conn.execute(
            f"update {self.table} set data = %s, updated_at = now() where id = %s",
            (Jsonb(self._data_for_storage(item)), item_id),
        )

    def _row_to_item(self, row: Dict[str, Any]) -> Dict[str, Any]:
        item = self._shape_item(dict(row.get("data") or {}))
        item["id"] = int(row["id"])
        self._ensure_uid(item)
        return item

    def _shape_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        if self.defaults is None:
            return deepcopy(item)

        source = deepcopy(item)
        if self.unwrap_data and isinstance(source.get("data"), dict):
            source = {"spec": source.get("spec", ""), **source["data"]}

        return {
            key: _coerce_by_default(source[key], default) if key in source else deepcopy(default)
            for key, default in self.defaults.items()
        }

    def _ensure_uid(self, item: Dict[str, Any]) -> None:
        if "uid" not in item:
            return
        uid = _coerce_int(item.get("uid"))
        item_id = _coerce_int(item.get("id"))
        if (uid is None or uid <= 0) and item_id is not None:
            item["uid"] = item_id

    def _data_for_storage(self, item: Dict[str, Any]) -> Dict[str, Any]:
        data = deepcopy(item)
        data.pop("id", None)
        data.pop("created_at", None)
        data.pop("updated_at", None)
        return data


class PostgresLorebookCollection(PostgresCollection):
    def list_entries(self, user_id: int, lorebook_id: int) -> Any:
        lorebook = self.get(user_id, lorebook_id)
        if lorebook is None:
            return None
        entries = self._normalize_entries(lorebook.get("entries"))
        return [deepcopy(entry) for _, entry in entries]

    def get_entry(self, user_id: int, lorebook_id: int, entry_id: int) -> Any:
        lorebook = self.get(user_id, lorebook_id)
        if lorebook is None:
            return None
        for _, entry in self._normalize_entries(lorebook.get("entries")):
            if self._entry_id(entry) == entry_id:
                return deepcopy(entry)
        return None

    def create_entry(self, user_id: int, lorebook_id: int, payload: Dict[str, Any]) -> Any:
        lorebook = self.get(user_id, lorebook_id)
        if lorebook is None:
            return None
        entries = self._normalize_entries(lorebook.get("entries"))
        new_entry = self._prepare_entry_create(payload, entries)
        entries.append((str(self._entry_id(new_entry)), new_entry))
        lorebook["entries"] = {key: entry for key, entry in entries}
        self.replace(user_id, lorebook_id, lorebook)
        return deepcopy(new_entry)

    def replace_entry(
        self,
        user_id: int,
        lorebook_id: int,
        entry_id: int,
        payload: Dict[str, Any],
    ) -> Any:
        return self._mutate_entry(user_id, lorebook_id, payload, "replace", entry_id)

    def patch_entry(
        self,
        user_id: int,
        lorebook_id: int,
        entry_id: int,
        payload: Dict[str, Any],
    ) -> Any:
        return self._mutate_entry(user_id, lorebook_id, payload, "patch", entry_id)

    def delete_entry(self, user_id: int, lorebook_id: int, entry_id: int) -> bool:
        lorebook = self.get(user_id, lorebook_id)
        if lorebook is None:
            return False
        entries = self._normalize_entries(lorebook.get("entries"))
        filtered = [(key, entry) for key, entry in entries if self._entry_id(entry) != entry_id]
        if len(filtered) == len(entries):
            return False
        lorebook["entries"] = {key: entry for key, entry in filtered}
        self.replace(user_id, lorebook_id, lorebook)
        return True

    def _mutate_entry(
        self,
        user_id: int,
        lorebook_id: int,
        payload: Dict[str, Any],
        mode: str,
        entry_id: int,
    ) -> Any:
        lorebook = self.get(user_id, lorebook_id)
        if lorebook is None:
            return None
        entries = self._normalize_entries(lorebook.get("entries"))
        for index, (key, entry) in enumerate(entries):
            if self._entry_id(entry) != entry_id:
                continue
            if mode == "replace":
                updated = self._prepare_entry_replace(payload, entry_id)
            else:
                updated = self._prepare_entry_patch(entry, payload, entry_id)
            entries[index] = (key, updated)
            lorebook["entries"] = {entry_key: entry_value for entry_key, entry_value in entries}
            self.replace(user_id, lorebook_id, lorebook)
            return deepcopy(updated)
        return None

    def _shape_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        shaped = super()._shape_item(item)
        entries = self._normalize_entries(item.get("entries", shaped.get("entries")))
        shaped["entries"] = {key: entry for key, entry in entries}
        return shaped

    def _normalize_entries(self, entries: Any) -> List[Tuple[str, Dict[str, Any]]]:
        if isinstance(entries, dict):
            source_items = list(entries.items())
        elif isinstance(entries, list):
            source_items = [(str(index + 1), value) for index, value in enumerate(entries)]
        else:
            source_items = []

        normalized: List[Tuple[str, Dict[str, Any]]] = []
        next_entry_id = self._next_entry_id(source_items)
        for raw_key, raw_entry in source_items:
            if not isinstance(raw_entry, dict):
                continue
            raw_entry_id = self._entry_id(raw_entry)
            raw_uid = _coerce_int(raw_entry.get("uid"))
            key_id = _coerce_int(raw_key)
            entry_id = raw_entry_id if raw_entry_id is not None else raw_uid
            if entry_id is None or entry_id <= 0:
                entry_id = key_id
            if entry_id is None:
                entry_id = next_entry_id
            entry = self._shape_entry(raw_entry)
            entry["id"] = entry_id
            self._ensure_entry_uid(entry, entry_id)
            normalized.append((str(entry_id), entry))
            if entry_id >= next_entry_id:
                next_entry_id = entry_id + 1
        normalized.sort(key=lambda item: self._entry_id(item[1]) or 0)
        return normalized

    def _shape_entry(self, entry: Dict[str, Any]) -> Dict[str, Any]:
        return {
            key: _coerce_by_default(entry[key], default) if key in entry else deepcopy(default)
            for key, default in ENTRY_DEFAULTS.items()
        }

    def _prepare_entry_create(
        self,
        payload: Dict[str, Any],
        entries: List[Tuple[str, Dict[str, Any]]],
    ) -> Dict[str, Any]:
        if not isinstance(payload, dict):
            raise TypeError("payload must be a JSON object")
        entry = self._shape_entry(payload)
        uid = _coerce_int(entry.get("uid"))
        next_entry_id = self._next_entry_id(entries)
        entry_id = uid if uid is not None and uid > 0 else next_entry_id
        entry["id"] = entry_id
        self._ensure_entry_uid(entry, entry_id)
        return entry

    def _prepare_entry_replace(self, payload: Dict[str, Any], entry_id: int) -> Dict[str, Any]:
        if not isinstance(payload, dict):
            raise TypeError("payload must be a JSON object")
        entry = self._shape_entry(payload)
        entry["id"] = entry_id
        self._ensure_entry_uid(entry, entry_id)
        return entry

    def _prepare_entry_patch(
        self,
        current_entry: Dict[str, Any],
        payload: Dict[str, Any],
        entry_id: int,
    ) -> Dict[str, Any]:
        patched = deepcopy(current_entry)
        for key, value in payload.items():
            if key != "id":
                patched[key] = value
        entry = self._shape_entry(patched)
        entry["id"] = entry_id
        self._ensure_entry_uid(entry, entry_id)
        return entry

    def _ensure_entry_uid(self, entry: Dict[str, Any], entry_id: int) -> None:
        uid = _coerce_int(entry.get("uid"))
        if uid is None or uid <= 0:
            entry["uid"] = entry_id

    def _entry_id(self, entry: Dict[str, Any]) -> Any:
        return _coerce_int(entry.get("id"))

    def _next_entry_id(self, entries: List[Tuple[str, Dict[str, Any]]]) -> int:
        max_id = 0
        for key, entry in entries:
            if not isinstance(entry, dict):
                continue
            entry_id = self._entry_id(entry)
            if entry_id is None:
                entry_id = _coerce_int(entry.get("uid"))
            if entry_id is None:
                entry_id = _coerce_int(key)
            if entry_id is not None and entry_id > max_id:
                max_id = entry_id
        return max_id + 1

