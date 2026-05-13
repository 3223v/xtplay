from __future__ import annotations

import os
from typing import Any

from app.tts.mimo_provider import MimoProvider
from app.tts.provider import TTSProvider, TTSResponse, TTSError


def create_tts_provider(provider_name: str | None = None) -> TTSProvider:
    name = provider_name or os.getenv("TTS_PROVIDER", "mimo")
    if name == "mimo":
        return MimoProvider()
    raise TTSError(f"未知的 TTS 提供商: {name}")


_PROVIDER_CACHE: dict[str, TTSProvider] = {}


def _get_provider() -> TTSProvider:
    name = os.getenv("TTS_PROVIDER", "mimo")
    if name not in _PROVIDER_CACHE:
        _PROVIDER_CACHE[name] = create_tts_provider(name)
    return _PROVIDER_CACHE[name]


def _resolve_voice(role: str) -> str:
    if role == "role1":
        return os.getenv("TTS_VOICE_ROLE1") or os.getenv("TTS_DEFAULT_VOICE", "mimo_default")
    if role == "role2":
        return os.getenv("TTS_VOICE_ROLE2") or os.getenv("TTS_DEFAULT_VOICE", "mimo_default")
    return os.getenv("TTS_DEFAULT_VOICE", "mimo_default")


def synthesize_dialogue(text: str, role: str, **kwargs: Any) -> TTSResponse:
    provider = _get_provider()
    voice = _resolve_voice(role)
    return provider.synthesize(text, voice, **kwargs)
