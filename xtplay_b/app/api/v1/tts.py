
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.services.tts import synthesize_dialogue
from .dependencies import current_user_id

router = APIRouter(prefix="/tts", tags=["tts"])


class TTSRequest(BaseModel):
    text: str
    role: str  # "role1" or "role2"


class TTSResponse(BaseModel):
    audio_base64: str
    format: str = "wav"


@router.post("/synthesize", response_model=TTSResponse)
def synthesize_tts(payload: TTSRequest, user_id: int = Depends(current_user_id)) -> TTSResponse:
    try:
        result = synthesize_dialogue(payload.text, payload.role)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"TTS 鍚堟垚澶辫触: {exc}",
        ) from exc
    return TTSResponse(audio_base64=result.audio_base64, format=result.format)

