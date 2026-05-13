from __future__ import annotations

from typing import Any, Protocol

from app.services.llm import generate_action, generate_scene
from app.services.prompts import (
    build_action_messages,
    build_opening_scene_messages,
    build_scene_messages,
)


class RoundStore(Protocol):
    def create_round(self, user_id: int, owner_id: int, payload: dict[str, Any]) -> dict[str, Any] | None: ...

    def replace_round(
        self,
        user_id: int,
        owner_id: int,
        round_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any] | None: ...


def _has_role(story: dict[str, Any], role_key: str) -> bool:
    role = story.get(role_key, {})
    return isinstance(role, dict) and bool(str(role.get("name", "")).strip())


def _ensure_readable(story: dict[str, Any]) -> None:
    if not _has_role(story, "role1") or not _has_role(story, "role2"):
        raise ValueError("故事必须设置两个角色后才可以生成下一轮")


def _format_action_output(action_data: dict[str, Any]) -> str:
    action = str(action_data.get("action", "") or "").strip()
    dialogue = str(action_data.get("dialogue", "") or "").strip()
    parts = []
    if action:
        parts.append(action)
    if dialogue:
        parts.append(f"「{dialogue}」")
    return "\n".join(parts)


def _normalize_scene(
    scene_result: dict[str, Any],
    story: dict[str, Any],
    rounds: list[dict[str, Any]],
) -> dict[str, Any]:
    previous_scene = ""
    for round_item in reversed(rounds):
        if round_item.get("next_scene"):
            previous_scene = str(round_item["next_scene"])
            break
        if round_item.get("scene"):
            previous_scene = str(round_item["scene"])
            break
    if not previous_scene:
        previous_scene = str(story.get("initial_scene", ""))

    first = scene_result.get("first", "role1")
    if first not in {"role1", "role2"}:
        first = "role1"

    scene = str(scene_result.get("scene", "") or "").strip() or previous_scene
    narration = str(scene_result.get("narration", "") or "").strip()
    return {"scene": scene, "narration": narration, "first": first}


def _blank_round(round_id: int, scene: str, narration: str, first: str) -> dict[str, Any]:
    return {
        "id": round_id,
        "scene": scene,
        "narration": narration,
        "first": first,
        "next_scene": "",
        "next_narration": "",
        "next_first": "role1",
        "role1_action": "",
        "role1_dialogue": "",
        "role1_output": "",
        "role2_action": "",
        "role2_dialogue": "",
        "role2_output": "",
    }


def _next_round_id(rounds: list[dict[str, Any]]) -> int:
    existing_ids = [r.get("id", 0) for r in rounds if isinstance(r.get("id"), int)]
    return max(existing_ids, default=0) + 1


def _has_role_output(round_item: dict[str, Any]) -> bool:
    return any(
        str(round_item.get(key, "") or "").strip()
        for key in (
            "role1_action",
            "role1_dialogue",
            "role1_output",
            "role2_action",
            "role2_dialogue",
            "role2_output",
        )
    )


def _apply_action(round_item: dict[str, Any], role_key: str, action_data: dict[str, Any]) -> None:
    action = str(action_data.get("action", "") or "").strip()
    dialogue = str(action_data.get("dialogue", "") or "").strip()
    round_item[f"{role_key}_action"] = action
    round_item[f"{role_key}_dialogue"] = dialogue
    round_item[f"{role_key}_output"] = _format_action_output({"action": action, "dialogue": dialogue})


def generate_opening_scene(story: dict[str, Any]) -> dict[str, Any]:
    _ensure_readable(story)
    rounds = story.get("round", [])
    scene_messages = build_opening_scene_messages(story, rounds)
    return _normalize_scene(generate_scene(story, scene_messages), story, rounds)


def generate_next_round(
    round_store: RoundStore,
    user_id: int,
    owner_id: int,
    story: dict[str, Any],
    rounds: list[dict[str, Any]],
) -> dict[str, Any] | None:
    _ensure_readable(story)

    if not rounds:
        opening = generate_opening_scene(story)
        return round_store.create_round(
            user_id,
            owner_id,
            _blank_round(1, opening["scene"], opening["narration"], opening["first"]),
        )

    last_round = rounds[-1]
    should_fill_last_round = not _has_role_output(last_round)
    history_rounds = rounds[:-1] if should_fill_last_round else rounds

    if should_fill_last_round:
        new_round = dict(last_round)
        current_scene = str(new_round.get("scene") or story.get("initial_scene", ""))
        current_narration = str(new_round.get("narration") or "")
        first_role = new_round.get("first") or "role1"
    else:
        current_scene = str(last_round.get("next_scene") or last_round.get("scene") or story.get("initial_scene", ""))
        current_narration = str(last_round.get("next_narration") or "")
        first_role = last_round.get("next_first") or last_round.get("first") or "role1"
        new_round = _blank_round(_next_round_id(rounds), current_scene, current_narration, first_role)

    if first_role not in {"role1", "role2"}:
        first_role = "role1"
    second_role = "role2" if first_role == "role1" else "role1"

    new_round["scene"] = current_scene
    new_round["narration"] = current_narration
    new_round["first"] = first_role

    first_messages = build_action_messages(story, history_rounds, new_round, first_role)
    _apply_action(new_round, first_role, generate_action(story, first_messages))

    second_messages = build_action_messages(story, history_rounds, new_round, second_role)
    _apply_action(new_round, second_role, generate_action(story, second_messages))

    scene_messages = build_scene_messages(story, [*history_rounds, new_round])
    next_scene = _normalize_scene(generate_scene(story, scene_messages), story, [*history_rounds, new_round])
    new_round["next_scene"] = next_scene["scene"]
    new_round["next_narration"] = next_scene["narration"]
    new_round["next_first"] = next_scene["first"]

    if should_fill_last_round:
        return round_store.replace_round(user_id, owner_id, int(new_round["id"]), new_round)
    return round_store.create_round(user_id, owner_id, new_round)
