from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


class TTSError(Exception):
    """Raised when TTS synthesis fails."""


@dataclass
class TTSResponse:
    audio_base64: str
    format: str = "wav"
    duration_ms: int = 0
    metadata: dict[str, Any] | None = None


class TTSProvider(ABC):
    @abstractmethod
    def synthesize(self, text: str, voice: str, **kwargs: Any) -> TTSResponse:
        """Convert text to speech.

        Args:
            text: The text to speak (dialogue line).
            voice: Voice identifier (provider-specific).
            **kwargs: Provider-specific options (style, speed, etc.).

        Returns:
            TTSResponse with base64-encoded audio data.

        Raises:
            TTSError: If synthesis fails.
        """
        ...
