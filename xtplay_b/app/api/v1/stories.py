
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import PostgresStoryCollection
from app.model.story import StoryCreate, StoryPatch, StoryRead, StoryReplace
from .dependencies import current_user_id, _not_found

router = APIRouter(prefix="/stories", tags=["stories"])

STORY_STORE = PostgresStoryCollection()


@router.get("", response_model=list[StoryRead])
def list_stories(user_id: int = Depends(current_user_id)) -> list[dict]:
    return STORY_STORE.list_all(user_id)


@router.get("/{story_id}", response_model=StoryRead)
def get_story(story_id: int, user_id: int = Depends(current_user_id)) -> dict:
    item = STORY_STORE.get(user_id, story_id)
    if item is None:
        raise _not_found("story", story_id)
    return item


@router.post("", status_code=status.HTTP_201_CREATED, response_model=StoryRead)
def create_story(payload: StoryCreate, user_id: int = Depends(current_user_id)) -> dict:
    return STORY_STORE.create(user_id, payload.model_dump(mode="json"))


@router.put("/{story_id}", response_model=StoryRead)
def replace_story(story_id: int, payload: StoryReplace, user_id: int = Depends(current_user_id)) -> dict:
    item = STORY_STORE.replace(user_id, story_id, payload.model_dump(mode="json"))
    if item is None:
        raise _not_found("story", story_id)
    return item


@router.patch("/{story_id}", response_model=StoryRead)
def patch_story(story_id: int, payload: StoryPatch, user_id: int = Depends(current_user_id)) -> dict:
    item = STORY_STORE.patch(user_id, story_id, payload.model_dump(mode="json", exclude_unset=True))
    if item is None:
        raise _not_found("story", story_id)
    return item


@router.delete("/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_story(story_id: int, user_id: int = Depends(current_user_id)) -> None:
    if not STORY_STORE.delete(user_id, story_id):
        raise _not_found("story", story_id)


@router.get("/{story_id}/rounds", response_model=list[dict])
def list_story_rounds(story_id: int, user_id: int = Depends(current_user_id)) -> list[dict]:
    rounds = STORY_STORE.list_rounds(user_id, story_id)
    if rounds is None:
        raise _not_found("story", story_id)
    return rounds


@router.get("/{story_id}/rounds/{round_id}", response_model=dict)
def get_story_round(story_id: int, round_id: int, user_id: int = Depends(current_user_id)) -> dict:
    round_item = STORY_STORE.get_round(user_id, story_id, round_id)
    if round_item is None:
        raise _not_found("round", round_id)
    return round_item


@router.post("/{story_id}/rounds", status_code=status.HTTP_201_CREATED, response_model=dict)
def create_story_round(story_id: int, payload: dict, user_id: int = Depends(current_user_id)) -> dict:
    round_item = STORY_STORE.create_round(user_id, story_id, payload)
    if round_item is None:
        raise _not_found("story", story_id)
    return round_item


@router.put("/{story_id}/rounds/{round_id}", response_model=dict)
def replace_story_round(
    story_id: int,
    round_id: int,
    payload: dict,
    user_id: int = Depends(current_user_id),
) -> dict:
    round_item = STORY_STORE.replace_round(user_id, story_id, round_id, payload)
    if round_item is None:
        raise _not_found("round", round_id)
    return round_item


@router.patch("/{story_id}/rounds/{round_id}", response_model=dict)
def patch_story_round(
    story_id: int,
    round_id: int,
    payload: dict,
    user_id: int = Depends(current_user_id),
) -> dict:
    round_item = STORY_STORE.patch_round(user_id, story_id, round_id, payload)
    if round_item is None:
        raise _not_found("round", round_id)
    return round_item


@router.delete("/{story_id}/rounds/{round_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_story_round(story_id: int, round_id: int, user_id: int = Depends(current_user_id)) -> None:
    if not STORY_STORE.delete_round(user_id, story_id, round_id):
        raise _not_found("round", round_id)

