from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from threading import RLock
from typing import Any

ROLE_DEFAULTS: dict[str, Any] = {
    "spec": "",
    "name": "",
    "description": "",
    "personality": "",
    "first_mes": "",
    "avatar": "",
    "mes_example": "",
    "scenario": "",
    "creator_notes": "",
    "system_prompt": "",
    "post_history_instructions": "",
    "alternate_greetings": [],
    "tags": [],
}

PRESET_DEFAULTS: dict[str, Any] = {
    "temperature": 0.75,
    "frequency_penalty": 0.8,
    "presence_penalty": 0.8,
    "top_p": 0.99,
    "top_k": 75,
    "top_a": 0,
    "min_p": 0.1,
    "repetition_penalty": 1.1,
    "names_in_completion": True,
    "main_prompt": "",
    "impersonation_prompt": "",
    "assistant_prefill": "",
    "jailbreak_prompt": "",
}

ENTRY_DEFAULTS: dict[str, Any] = {
    "uid": 0,
    "key": [],
    "keysecondary": [],
    "comment": "",
    "content": "",
    "order": 100,
}

LOREBOOK_DEFAULTS: dict[str, Any] = {
    "name": "",
    "description": "",
    "scan_depth": 50,
    "token_budget": 500,
    "entries": {},
}


def _coerce_int(value: Any) -> int | None:
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


def _coerce_float(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            return float(text)
        except ValueError:
            return None
    return None


def _coerce_bool(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        text = value.strip().lower()
        if text in {"true", "1", "yes", "y"}:
            return True
        if text in {"false", "0", "no", "n"}:
            return False
    return None


def _coerce_string_list(value: Any) -> list[str] | None:
    if isinstance(value, list):
        return [str(item) for item in value if item is not None]
    if isinstance(value, str):
        return [part.strip() for part in value.split(",") if part.strip()]
    return None


def _coerce_by_default(value: Any, default: Any) -> Any:
    if isinstance(default, bool):
        return _coerce_bool(value) if _coerce_bool(value) is not None else deepcopy(default)
    if isinstance(default, int) and not isinstance(default, bool):
        return _coerce_int(value) if _coerce_int(value) is not None else deepcopy(default)
    if isinstance(default, float):
        return _coerce_float(value) if _coerce_float(value) is not None else deepcopy(default)
    if isinstance(default, str):
        return value if isinstance(value, str) else deepcopy(default)
    if isinstance(default, list):
        return _coerce_string_list(value) if _coerce_string_list(value) is not None else deepcopy(default)
    if isinstance(default, dict):
        return deepcopy(value) if isinstance(value, dict) else deepcopy(default)
    return deepcopy(value)


class JsonCollection:
    def __init__(
        self,
        file_path: Path,
        defaults: dict[str, Any] | None = None,
        unwrap_data: bool = False,
    ) -> None:
        self.file_path = file_path
        self.defaults = defaults
        self.unwrap_data = unwrap_data
        self._lock = RLock()
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.file_path.exists():
            self._write_raw([])

    def list_all(self) -> list[dict[str, Any]]:
        with self._lock:
            items = self._read_raw()
            normalized, changed = self._normalize_collection(items)
            if changed:
                self._write_raw(normalized)
            return normalized

    def get(self, item_id: int) -> dict[str, Any] | None:
        with self._lock:
            items = self._read_raw()
            normalized, changed = self._normalize_collection(items)
            if changed:
                self._write_raw(normalized)
            for item in normalized:
                if self._item_id(item) == item_id:
                    return deepcopy(item)
            return None

    def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            items = self._read_raw()
            normalized, _ = self._normalize_collection(items)
            next_id = self._next_id(normalized)
            created = self._prepare_create_item(payload, next_id)
            normalized.append(created)
            self._write_raw(normalized)
            return deepcopy(created)

    def replace(self, item_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
        with self._lock:
            items = self._read_raw()
            normalized, changed = self._normalize_collection(items)
            for index, item in enumerate(normalized):
                if self._item_id(item) == item_id:
                    replaced = self._prepare_replace_item(payload, item_id)
                    normalized[index] = replaced
                    self._write_raw(normalized)
                    return deepcopy(replaced)
            if changed:
                self._write_raw(normalized)
            return None

    def patch(self, item_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
        with self._lock:
            items = self._read_raw()
            normalized, changed = self._normalize_collection(items)
            for index, item in enumerate(normalized):
                if self._item_id(item) == item_id:
                    patched = self._prepare_patch_item(item, payload, item_id)
                    normalized[index] = patched
                    self._write_raw(normalized)
                    return deepcopy(patched)
            if changed:
                self._write_raw(normalized)
            return None

    def delete(self, item_id: int) -> bool:
        with self._lock:
            items = self._read_raw()
            normalized, changed = self._normalize_collection(items)
            filtered = [item for item in normalized if self._item_id(item) != item_id]
            if len(filtered) == len(normalized) and not changed:
                return False
            self._write_raw(filtered)
            return len(filtered) != len(normalized)

    def _prepare_create_item(self, payload: dict[str, Any], item_id: int) -> dict[str, Any]:
        if not isinstance(payload, dict):
            raise TypeError("payload must be a JSON object")
        item = self._shape_item(payload)
        item["id"] = item_id
        self._ensure_uid(item)
        return item

    def _prepare_replace_item(self, payload: dict[str, Any], item_id: int) -> dict[str, Any]:
        if not isinstance(payload, dict):
            raise TypeError("payload must be a JSON object")
        item = self._shape_item(payload)
        item["id"] = item_id
        self._ensure_uid(item)
        return item

    def _prepare_patch_item(
        self,
        current_item: dict[str, Any],
        payload: dict[str, Any],
        item_id: int,
    ) -> dict[str, Any]:
        patched = deepcopy(current_item)
        patched.update(deepcopy(payload))
        patched = self._shape_item(patched)
        patched["id"] = item_id
        self._ensure_uid(patched)
        return patched

    def _normalize_collection(self, items: Any) -> tuple[list[dict[str, Any]], bool]:
        if not isinstance(items, list):
            return [], items != []

        normalized: list[dict[str, Any]] = []
        changed = False
        next_id = self._next_id(items)
        for item in items:
            if not isinstance(item, dict):
                changed = True
                continue
            normalized_item = self._normalize_item(item, next_id)
            if normalized_item != item:
                changed = True
            normalized.append(normalized_item)
            assigned_id = self._item_id(normalized_item)
            if assigned_id is not None and assigned_id >= next_id:
                next_id = assigned_id + 1
        return normalized, changed

    def _normalize_item(self, item: dict[str, Any], next_id: int) -> dict[str, Any]:
        normalized = self._shape_item(item)
        item_id = self._item_id(item)
        if item_id is None:
            normalized["id"] = next_id
        else:
            normalized["id"] = item_id
        self._ensure_uid(normalized)
        return normalized

    def _shape_item(self, item: dict[str, Any]) -> dict[str, Any]:
        if self.defaults is None:
            return deepcopy(item)

        source = deepcopy(item)
        if self.unwrap_data and isinstance(source.get("data"), dict):
            source = {"spec": source.get("spec", ""), **source["data"]}

        shaped = {
            key: _coerce_by_default(source[key], default) if key in source else deepcopy(default)
            for key, default in self.defaults.items()
        }
        return shaped

    def _ensure_uid(self, item: dict[str, Any]) -> None:
        if "uid" not in item:
            return
        uid = _coerce_int(item.get("uid"))
        item_id = self._item_id(item)
        if (uid is None or uid <= 0) and item_id is not None:
            item["uid"] = item_id

    def _item_id(self, item: dict[str, Any]) -> int | None:
        return _coerce_int(item.get("id"))

    def _next_id(self, items: list[dict[str, Any]]) -> int:
        max_id = 0
        for item in items:
            if not isinstance(item, dict):
                continue
            item_id = self._item_id(item)
            if item_id is not None and item_id > max_id:
                max_id = item_id
        return max_id + 1

    def _read_raw(self) -> Any:
        if not self.file_path.exists():
            return []
        with self.file_path.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def _write_raw(self, data: Any) -> None:
        with self.file_path.open("w", encoding="utf-8") as handle:
            json.dump(data, handle, ensure_ascii=False, indent=2)
            handle.write("\n")


class LorebookCollection(JsonCollection):
    def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        created = super().create(payload)
        created_id = self._item_id(created)
        if created_id is None:
            return created
        normalized = self.get(created_id)
        return normalized if normalized is not None else created

    def replace(self, item_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
        replaced = super().replace(item_id, payload)
        if replaced is None:
            return None
        normalized = self.get(item_id)
        return normalized if normalized is not None else replaced

    def patch(self, item_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
        patched = super().patch(item_id, payload)
        if patched is None:
            return None
        normalized = self.get(item_id)
        return normalized if normalized is not None else patched

    def list_entries(self, lorebook_id: int) -> list[dict[str, Any]] | None:
        lorebook = self.get(lorebook_id)
        if lorebook is None:
            return None
        entries = self._normalize_entries(lorebook.get("entries"))
        return [deepcopy(entry) for _, entry in entries]

    def get_entry(self, lorebook_id: int, entry_id: int) -> dict[str, Any] | None:
        lorebook = self.get(lorebook_id)
        if lorebook is None:
            return None
        entries = self._normalize_entries(lorebook.get("entries"))
        for _, entry in entries:
            if self._entry_id(entry) == entry_id:
                return deepcopy(entry)
        return None

    def create_entry(self, lorebook_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
        return self._mutate_entry(lorebook_id, payload, mode="create")

    def replace_entry(
        self,
        lorebook_id: int,
        entry_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any] | None:
        return self._mutate_entry(lorebook_id, payload, mode="replace", entry_id=entry_id)

    def patch_entry(
        self,
        lorebook_id: int,
        entry_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any] | None:
        return self._mutate_entry(lorebook_id, payload, mode="patch", entry_id=entry_id)

    def delete_entry(self, lorebook_id: int, entry_id: int) -> bool:
        with self._lock:
            items = self._read_raw()
            normalized, changed = self._normalize_collection(items)
            updated = False
            for index, lorebook in enumerate(normalized):
                if self._item_id(lorebook) != lorebook_id:
                    continue
                entries = self._normalize_entries(lorebook.get("entries"))
                filtered = [(key, entry) for key, entry in entries if self._entry_id(entry) != entry_id]
                if len(filtered) != len(entries):
                    lorebook["entries"] = {key: entry for key, entry in filtered}
                    normalized[index] = lorebook
                    updated = True
                break
            if updated or changed:
                self._write_raw(normalized)
            return updated

    def _normalize_item(self, item: dict[str, Any], next_id: int) -> dict[str, Any]:
        normalized = super()._normalize_item(item, next_id)
        raw_entries = item.get("entries", normalized.get("entries"))
        entries = self._normalize_entries(raw_entries)
        normalized["entries"] = {key: entry for key, entry in entries}
        return normalized

    def _mutate_entry(
        self,
        lorebook_id: int,
        payload: dict[str, Any],
        mode: str,
        entry_id: int | None = None,
    ) -> dict[str, Any] | None:
        with self._lock:
            items = self._read_raw()
            normalized, changed = self._normalize_collection(items)
            for index, lorebook in enumerate(normalized):
                if self._item_id(lorebook) != lorebook_id:
                    continue
                entries = self._normalize_entries(lorebook.get("entries"))
                if mode == "create":
                    new_entry = self._prepare_entry_create(payload, entries)
                    entries.append((str(self._entry_id(new_entry)), new_entry))
                    lorebook["entries"] = {key: entry for key, entry in entries}
                    normalized[index] = lorebook
                    self._write_raw(normalized)
                    return deepcopy(new_entry)
                for entry_index, (key, entry) in enumerate(entries):
                    if self._entry_id(entry) != entry_id:
                        continue
                    if mode == "replace":
                        updated = self._prepare_entry_replace(payload, entry_id or 0)
                    else:
                        updated = self._prepare_entry_patch(entry, payload, entry_id or 0)
                    entries[entry_index] = (key, updated)
                    lorebook["entries"] = {entry_key: entry_value for entry_key, entry_value in entries}
                    normalized[index] = lorebook
                    self._write_raw(normalized)
                    return deepcopy(updated)
                break
            if changed:
                self._write_raw(normalized)
            return None

    def _normalize_entries(self, entries: Any) -> list[tuple[str, dict[str, Any]]]:
        if isinstance(entries, dict):
            source_items = list(entries.items())
        elif isinstance(entries, list):
            source_items = [(str(index + 1), value) for index, value in enumerate(entries)]
        else:
            source_items = []

        normalized: list[tuple[str, dict[str, Any]]] = []
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

    def _ensure_entry_uid(self, entry: dict[str, Any], entry_id: int) -> None:
        uid = _coerce_int(entry.get("uid"))
        if uid is None or uid <= 0:
            entry["uid"] = entry_id

    def _prepare_entry_create(self, payload: dict[str, Any], entries: list[tuple[str, dict[str, Any]]]) -> dict[str, Any]:
        if not isinstance(payload, dict):
            raise TypeError("payload must be a JSON object")
        entry = self._shape_entry(payload)
        uid = _coerce_int(entry.get("uid"))
        next_entry_id = self._next_entry_id(entries)
        entry_id = uid if uid is not None and uid > 0 else next_entry_id
        entry["id"] = entry_id
        self._ensure_entry_uid(entry, entry_id)
        return entry

    def _prepare_entry_replace(self, payload: dict[str, Any], entry_id: int) -> dict[str, Any]:
        if not isinstance(payload, dict):
            raise TypeError("payload must be a JSON object")
        entry = self._shape_entry(payload)
        entry["id"] = entry_id
        self._ensure_entry_uid(entry, entry_id)
        return entry

    def _prepare_entry_patch(
        self,
        current_entry: dict[str, Any],
        payload: dict[str, Any],
        entry_id: int,
    ) -> dict[str, Any]:
        patched = deepcopy(current_entry)
        patched.update(deepcopy(payload))
        patched = self._shape_entry(patched)
        patched["id"] = entry_id
        self._ensure_entry_uid(patched, entry_id)
        return patched

    def _shape_entry(self, entry: dict[str, Any]) -> dict[str, Any]:
        shaped = {
            key: _coerce_by_default(entry[key], default) if key in entry else deepcopy(default)
            for key, default in ENTRY_DEFAULTS.items()
        }
        return shaped

    def _entry_id(self, entry: dict[str, Any]) -> int | None:
        return _coerce_int(entry.get("id"))

    def _next_entry_id(self, entries: list[tuple[str, dict[str, Any]]]) -> int:
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
