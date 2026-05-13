from __future__ import annotations

import base64
import logging
import os
from typing import Any

import httpx

from app.tts.provider import TTSProvider, TTSResponse, TTSError

logger = logging.getLogger(__name__)

MIMO_BASE_URL = "https://api.xiaomimimo.com/v1"
MIMO_MODEL = "mimo-v2.5-tts"
DEFAULT_TIMEOUT = 30.0


class MimoProvider(TTSProvider):
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        self.api_key = api_key or os.getenv("MIMO_API_KEY", "")
        if not self.api_key:
            raise TTSError("MIMO_API_KEY is not configured")
        self.base_url = (base_url or os.getenv("MIMO_BASE_URL") or MIMO_BASE_URL).rstrip("/")
        self.timeout = timeout

    def synthesize(self, text: str, voice: str, **kwargs: Any) -> TTSResponse:
        if not text or not text.strip():
            raise TTSError("text must not be empty")

        payload: dict[str, Any] = {
            "model": MIMO_MODEL,
            "messages": [
                {"role": "assistant", "content": text},
            ],
            "audio": {
                "format": "wav",
                "voice": voice,
            },
        }

        # Optional style instruction from kwargs
        style = kwargs.get("style")
        if style:
            payload["messages"].insert(0, {"role": "user", "content": style})

        try:
            with httpx.Client(timeout=self.timeout) as client:
                url = f"{self.base_url}/chat/completions"
                logger.info("TTS requesting %s with voice=%s text_len=%d", url, voice, len(text))
                resp = client.post(
                    url,
                    headers={"api-key": self.api_key},
                    json=payload,
                )
                logger.info("TTS API responded %s", resp.status_code)
                if not resp.is_success:
                    logger.warning("TTS API error body: %s", resp.text[:500])
                resp.raise_for_status()
                data = resp.json()
        except httpx.TimeoutException as exc:
            logger.error("TTS request timed out after %.1fs: %s", self.timeout, exc)
            raise TTSError(f"TTS 请求超时: {exc}") from exc
        except httpx.HTTPStatusError as exc:
            detail = self._extract_error_detail(exc)
            logger.error("TTS API returned %s: %s", exc.response.status_code, detail)
            raise TTSError(f"TTS API 返回错误 ({exc.response.status_code}): {detail}") from exc
        except httpx.RequestError as exc:
            logger.error("TTS network request failed: %s", exc)
            raise TTSError(f"TTS 网络请求失败: {exc}") from exc

        try:
            audio_data = data["choices"][0]["message"]["audio"]["data"]
            audio_format = data["choices"][0]["message"]["audio"].get("format", "wav")
        except (KeyError, IndexError, TypeError) as exc:
            logger.error("TTS unexpected response structure: %s — data=%s", exc, str(data)[:300])
            raise TTSError(f"TTS 响应格式异常: {exc}") from exc

        # Validate it's valid base64
        try:
            base64.b64decode(audio_data)
        except Exception as exc:
            logger.error("TTS invalid base64 audio data: %s", exc)
            raise TTSError(f"TTS 返回的音频数据不是有效的 Base64: {exc}") from exc

        return TTSResponse(audio_base64=audio_data, format=audio_format)

    def _extract_error_detail(self, exc: httpx.HTTPStatusError) -> str:
        try:
            body = exc.response.json()
            if isinstance(body, dict):
                return str(body.get("error", body.get("detail", str(body))))
        except Exception:
            pass
        return exc.response.text[:200]
