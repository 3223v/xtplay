
from __future__ import annotations

from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import PostgresStoryCollection, PostgresSessionStore
from app.services.story_engine import generate_opening_scene, generate_next_round
from .dependencies import current_user_id, _not_found

router = APIRouter(tags=["sessions"])

STORY_STORE = PostgresStoryCollection()
SESSION_STORE = PostgresSessionStore()


@router.get("/stories/{story_id}/sessions", response_model=list[dict])
def list_sessions(story_id: int, user_id: int = Depends(current_user_id)) -> list:
    return SESSION_STORE.list_by_story(user_id, story_id)


@router.post("/stories/{story_id}/sessions", status_code=status.HTTP_201_CREATED, response_model=dict)
def create_session(story_id: int, payload: dict, user_id: int = Depends(current_user_id)) -> dict:
    story = STORY_STORE.get(user_id, story_id)
    if story is None:
        raise _not_found("story", story_id)
    session_data = {"title": payload.get("title", story.get("title", "New Session")), "status": "active"}
    return SESSION_STORE.create(user_id, story_id, session_data)


@router.get("/sessions/{session_id}", response_model=dict)
def get_session(session_id: int, user_id: int = Depends(current_user_id)) -> dict:
    session = SESSION_STORE.get(user_id, session_id)
    if session is None:
        raise _not_found("session", session_id)
    return session


@router.patch("/sessions/{session_id}", response_model=dict)
def update_session(session_id: int, payload: dict, user_id: int = Depends(current_user_id)) -> dict:
    session = SESSION_STORE.update(user_id, session_id, payload)
    if session is None:
        raise _not_found("session", session_id)
    return session


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(session_id: int, user_id: int = Depends(current_user_id)) -> None:
    if not SESSION_STORE.delete(user_id, session_id):
        raise _not_found("session", session_id)


@router.get("/sessions/{session_id}/rounds", response_model=list[dict])
def list_session_rounds(session_id: int, user_id: int = Depends(current_user_id)) -> list:
    session = SESSION_STORE.get(user_id, session_id)
    if session is None:
        raise _not_found("session", session_id)
    return SESSION_STORE.list_rounds(user_id, session_id)


@router.get("/sessions/{session_id}/rounds/{round_id}", response_model=dict)
def get_session_round(session_id: int, round_id: int, user_id: int = Depends(current_user_id)) -> dict:
    round_item = SESSION_STORE.get_round(user_id, session_id, round_id)
    if round_item is None:
        raise _not_found("round", round_id)
    return round_item


@router.post("/sessions/{session_id}/rounds", status_code=status.HTTP_201_CREATED, response_model=dict)
def create_session_round(session_id: int, payload: dict, user_id: int = Depends(current_user_id)) -> dict:
    round_item = SESSION_STORE.create_round(user_id, session_id, payload)
    if round_item is None:
        raise _not_found("session", session_id)
    return round_item


@router.put("/sessions/{session_id}/rounds/{round_id}", response_model=dict)
def replace_session_round(
    session_id: int, round_id: int, payload: dict, user_id: int = Depends(current_user_id)
) -> dict:
    round_item = SESSION_STORE.replace_round(user_id, session_id, round_id, payload)
    if round_item is None:
        raise _not_found("round", round_id)
    return round_item


@router.patch("/sessions/{session_id}/rounds/{round_id}", response_model=dict)
def patch_session_round(
    session_id: int, round_id: int, payload: dict, user_id: int = Depends(current_user_id)
) -> dict:
    round_item = SESSION_STORE.patch_round(user_id, session_id, round_id, payload)
    if round_item is None:
        raise _not_found("round", round_id)
    return round_item


@router.delete("/sessions/{session_id}/rounds/{round_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session_round(session_id: int, round_id: int, user_id: int = Depends(current_user_id)) -> None:
    if not SESSION_STORE.delete_round(user_id, session_id, round_id):
        raise _not_found("round", round_id)


@router.post("/sessions/{session_id}/generate-opening", response_model=dict)
def generate_session_opening(session_id: int, user_id: int = Depends(current_user_id)) -> dict:
    session = SESSION_STORE.get(user_id, session_id)
    if session is None:
        raise _not_found("session", session_id)

    story = STORY_STORE.get(user_id, int(session["story_id"]))
    if story is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Related story not found")

    composed: Dict[str, Any] = {**story, "round": session.get("round", [])}
    try:
        return generate_opening_scene(composed)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"LLM call failed: {exc}") from exc


@router.post("/sessions/{session_id}/generate-round", response_model=dict)
def generate_session_round(session_id: int, user_id: int = Depends(current_user_id)) -> dict:
    session = SESSION_STORE.get(user_id, session_id)
    if session is None:
        raise _not_found("session", session_id)

    story = STORY_STORE.get(user_id, int(session["story_id"]))
    if story is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Related story not found")

    rounds = session.get("round", [])
    try:
        result = generate_next_round(SESSION_STORE, user_id, session_id, story, rounds)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"LLM call failed: {exc}") from exc
    if result is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Round generation failed")
    return result


@router.post("/stories/{story_id}/generate-opening", response_model=dict)
def generate_story_opening(story_id: int, user_id: int = Depends(current_user_id)) -> dict:
    story = STORY_STORE.get(user_id, story_id)
    if story is None:
        raise _not_found("story", story_id)
    try:
        return generate_opening_scene(story)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"LLM call failed: {exc}") from exc


@router.post("/stories/{story_id}/generate-round", response_model=dict)
def generate_story_round(story_id: int, user_id: int = Depends(current_user_id)) -> dict:
    story = STORY_STORE.get(user_id, story_id)
    if story is None:
        raise _not_found("story", story_id)
    rounds = STORY_STORE.list_rounds(user_id, story_id) or []
    try:
        result = generate_next_round(STORY_STORE, user_id, story_id, story, rounds)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"LLM call failed: {exc}") from exc
    if result is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Round generation failed")
    return result

