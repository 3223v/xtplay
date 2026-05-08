from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

from openai import OpenAI
from openai.types.chat import ChatCompletionMessageParam

SCHEMA_DIR = Path(__file__).resolve().parents[2] / "schema"

SCENE_SCHEMA: dict[str, Any] = {
    "name": "scene_decision",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "scene_changed": {"type": "boolean"},
            "scene": {"type": "string"},
            "narration": {"type": "string"},
            "first": {"type": "string", "enum": ["role1", "role2"]},
        },
        "required": ["scene_changed", "scene", "narration", "first"],
        "additionalProperties": False,
    },
}

ACTION_SCHEMA: dict[str, Any] = {
    "name": "character_action",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "action": {"type": "string"},
            "dialogue": {"type": "string"},
        },
        "required": ["action", "dialogue"],
        "additionalProperties": False,
    },
}


def _build_client(story: dict[str, Any]) -> tuple[OpenAI, str]:
    api_key = story.get("api_key") or os.getenv("OPENAI_API_KEY", "")
    base_url = story.get("url") or os.getenv("OPENAI_BASE_URL", "https://api.deepseek.com")
    client = OpenAI(api_key=api_key, base_url=base_url)
    model = story.get("model") or os.getenv("OPENAI_MODEL", "deepseek-v4-flash")
    return client, model


def _chat(
    client: OpenAI,
    model: str,
    messages: list[ChatCompletionMessageParam],
    schema: dict[str, Any],
    temperature: float = 0.8,
) -> dict[str, Any]:
    response_format_attempts: list[dict[str, Any] | None] = [
        {"type": "json_schema", "json_schema": schema},
        {"type": "json_object"},
        None,
    ]
    last_error: Exception | None = None

    for response_format in response_format_attempts:
        try:
            kwargs: dict[str, Any] = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
            }
            if response_format is not None:
                kwargs["response_format"] = response_format
            response = client.chat.completions.create(**kwargs)
            content = response.choices[0].message.content or "{}"
            return _parse_json_content(content)
        except Exception as exc:
            last_error = exc
            if response_format is None or not _is_response_format_error(exc):
                raise

    if last_error is not None:
        raise last_error
    raise RuntimeError("LLM did not return a response")


def _is_response_format_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return "response_format" in text or "json_schema" in text or "json_object" in text


def _parse_json_content(content: str) -> dict[str, Any]:
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", content, flags=re.DOTALL)
        if match is None:
            raise
        parsed = json.loads(match.group(0))
    if not isinstance(parsed, dict):
        raise ValueError("LLM response must be a JSON object")
    return parsed


def generate_scene(
    story: dict[str, Any],
    messages: list[ChatCompletionMessageParam],
) -> dict[str, Any]:
    client, model = _build_client(story)
    temperature = _get_temperature(story)
    return _chat(client, model, messages, SCENE_SCHEMA, temperature)


def generate_action(
    story: dict[str, Any],
    messages: list[ChatCompletionMessageParam],
) -> dict[str, Any]:
    client, model = _build_client(story)
    temperature = _get_temperature(story)
    return _chat(client, model, messages, ACTION_SCHEMA, temperature)


def _get_temperature(story: dict[str, Any]) -> float:
    preset = story.get("preset", {})
    if isinstance(preset, dict) and "temperature" in preset:
        try:
            return float(preset["temperature"])
        except (ValueError, TypeError):
            pass
    return 0.8
