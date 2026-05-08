from __future__ import annotations

import json
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from threading import RLock
from typing import Any


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


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _format_output(action: Any, dialogue: Any) -> str:
    parts = []
    if isinstance(action, str) and action.strip():
        parts.append(action.strip())
    if isinstance(dialogue, str) and dialogue.strip():
        parts.append(f"「{dialogue.strip()}」")
    return "\n".join(parts)


class StoryCollection:
    def __init__(self, stories_dir: Path) -> None:
        self.stories_dir = stories_dir
        self._lock = RLock()
        self.stories_dir.mkdir(parents=True, exist_ok=True)

    def list_all(self) -> list[dict[str, Any]]:
        with self._lock:
            stories = []
            for file_path in sorted(self.stories_dir.glob("story_*.json")):
                story = self._read_story_file(file_path)
                if story is not None:
                    stories.append(story)
            return stories

    def get(self, story_id: int) -> dict[str, Any] | None:
        with self._lock:
            file_path = self._story_file_path(story_id)
            if not file_path.exists():
                return None
            return self._read_story_file(file_path)

    def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            story_id = self._next_id()
            story = deepcopy(payload)
            story["id"] = story_id
            story["created_at"] = _now_iso()
            story["updated_at"] = _now_iso()
            if "round" not in story:
                story["round"] = []
            story["round"] = self._normalize_rounds(story["round"])
            file_path = self._story_file_path(story_id)
            self._write_story_file(file_path, story)
            return deepcopy(story)

    def replace(self, story_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
        with self._lock:
            file_path = self._story_file_path(story_id)
            if not file_path.exists():
                return None
            existing = self._read_story_file(file_path)
            if existing is None:
                return None
            story = deepcopy(payload)
            story["id"] = story_id
            story["created_at"] = existing.get("created_at", _now_iso())
            story["updated_at"] = _now_iso()
            if "round" not in story:
                story["round"] = []
            story["round"] = self._normalize_rounds(story["round"])
            self._write_story_file(file_path, story)
            return deepcopy(story)

    def patch(self, story_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
        with self._lock:
            file_path = self._story_file_path(story_id)
            if not file_path.exists():
                return None
            story = self._read_story_file(file_path)
            if story is None:
                return None
            for key, value in payload.items():
                if key in ("id", "created_at"):
                    continue
                story[key] = value
            story["updated_at"] = _now_iso()
            if "round" in payload:
                story["round"] = self._normalize_rounds(story["round"])
            self._write_story_file(file_path, story)
            return deepcopy(story)

    def delete(self, story_id: int) -> bool:
        with self._lock:
            file_path = self._story_file_path(story_id)
            if not file_path.exists():
                return False
            file_path.unlink()
            return True

    def list_rounds(self, story_id: int) -> list[dict[str, Any]] | None:
        story = self.get(story_id)
        if story is None:
            return None
        return story.get("round", [])

    def get_round(self, story_id: int, round_id: int) -> dict[str, Any] | None:
        story = self.get(story_id)
        if story is None:
            return None
        for r in story.get("round", []):
            if r.get("id") == round_id:
                return deepcopy(r)
        return None

    def create_round(self, story_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
        with self._lock:
            file_path = self._story_file_path(story_id)
            if not file_path.exists():
                return None
            story = self._read_story_file(file_path)
            if story is None:
                return None
            rounds = self._normalize_rounds(story.get("round", []))
            next_round_id = self._next_round_id(rounds)
            new_round = deepcopy(payload)
            new_round["id"] = next_round_id
            self._normalize_round_shape(new_round)
            rounds.append(new_round)
            story["round"] = rounds
            story["updated_at"] = _now_iso()
            self._write_story_file(file_path, story)
            return deepcopy(new_round)

    def replace_round(
        self, story_id: int, round_id: int, payload: dict[str, Any]
    ) -> dict[str, Any] | None:
        with self._lock:
            file_path = self._story_file_path(story_id)
            if not file_path.exists():
                return None
            story = self._read_story_file(file_path)
            if story is None:
                return None
            rounds = self._normalize_rounds(story.get("round", []))
            for index, r in enumerate(rounds):
                if r.get("id") == round_id:
                    updated = deepcopy(payload)
                    updated["id"] = round_id
                    self._normalize_round_shape(updated)
                    rounds[index] = updated
                    story["round"] = rounds
                    story["updated_at"] = _now_iso()
                    self._write_story_file(file_path, story)
                    return deepcopy(updated)
            return None

    def patch_round(
        self, story_id: int, round_id: int, payload: dict[str, Any]
    ) -> dict[str, Any] | None:
        with self._lock:
            file_path = self._story_file_path(story_id)
            if not file_path.exists():
                return None
            story = self._read_story_file(file_path)
            if story is None:
                return None
            rounds = self._normalize_rounds(story.get("round", []))
            for index, r in enumerate(rounds):
                if r.get("id") == round_id:
                    for key, value in payload.items():
                        if key == "id":
                            continue
                        r[key] = value
                    self._normalize_round_shape(r)
                    rounds[index] = r
                    story["round"] = rounds
                    story["updated_at"] = _now_iso()
                    self._write_story_file(file_path, story)
                    return deepcopy(r)
            return None

    def delete_round(self, story_id: int, round_id: int) -> bool:
        with self._lock:
            file_path = self._story_file_path(story_id)
            if not file_path.exists():
                return False
            story = self._read_story_file(file_path)
            if story is None:
                return False
            rounds = story.get("round", [])
            filtered = [r for r in rounds if r.get("id") != round_id]
            if len(filtered) == len(rounds):
                return False
            story["round"] = filtered
            story["updated_at"] = _now_iso()
            self._write_story_file(file_path, story)
            return True

    def _story_file_path(self, story_id: int) -> Path:
        return self.stories_dir / f"story_{story_id}.json"

    def _next_id(self) -> int:
        max_id = 0
        for file_path in self.stories_dir.glob("story_*.json"):
            try:
                story_id = int(file_path.stem.split("_")[1])
                if story_id > max_id:
                    max_id = story_id
            except (ValueError, IndexError):
                continue
        return max_id + 1

    def _next_round_id(self, rounds: list[dict[str, Any]]) -> int:
        max_id = 0
        for r in rounds:
            round_id = r.get("id")
            if isinstance(round_id, int) and round_id > max_id:
                max_id = round_id
        return max_id + 1

    def _normalize_rounds(self, rounds: Any) -> list[dict[str, Any]]:
        if not isinstance(rounds, list):
            return []
        normalized = []
        next_id = self._next_round_id(rounds)
        for r in rounds:
            if not isinstance(r, dict):
                continue
            round_item = deepcopy(r)
            if "id" not in round_item or not isinstance(round_item["id"], int):
                round_item["id"] = next_id
                next_id += 1
            self._normalize_round_shape(round_item)
            normalized.append(round_item)
        return normalized

    def _normalize_round_shape(self, round_item: dict[str, Any]) -> None:
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

    def _read_story_file(self, file_path: Path) -> dict[str, Any] | None:
        try:
            with file_path.open("r", encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return None
        if not isinstance(data, dict):
            return None
        coerced = _coerce_int(data.get("id"))
        if coerced is not None:
            data["id"] = coerced
        rounds = data.get("round")
        if isinstance(rounds, list):
            for r in rounds:
                if isinstance(r, dict):
                    rid = _coerce_int(r.get("id"))
                    if rid is not None:
                        r["id"] = rid
            data["round"] = self._normalize_rounds(rounds)
        return data

    def _write_story_file(self, file_path: Path, data: dict[str, Any]) -> None:
        with file_path.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
