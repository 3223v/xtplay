from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.db.json_store import ENTRY_DEFAULTS, LOREBOOK_DEFAULTS, PRESET_DEFAULTS, ROLE_DEFAULTS
from app.db.postgres_store import (
    PostgresCollection,
    PostgresLorebookCollection,
    PostgresStoryCollection,
    PostgresUserStore,
    init_db,
    seed_legacy_json_data,
)
from app.model.entry import EntryCreate, EntryPatch, EntryRead, EntryReplace
from app.model.lorebook import LorebookCreate, LorebookPatch, LorebookRead, LorebookReplace
from app.model.preset import PresetCreate, PresetPatch, PresetRead, PresetReplace
from app.model.role import RoleCreate, RolePatch, RoleRead, RoleReplace
from app.model.story import StoryCreate, StoryPatch, StoryRead, StoryReplace
from app.model.user import AuthResponse, UserCredentials, UserPublic, UserRegister
from app.utils.paths import DATA_DIR


init_db()

ROLE_STORE = PostgresCollection("roles", ROLE_DEFAULTS, unwrap_data=True)
PRESET_STORE = PostgresCollection("presets", PRESET_DEFAULTS)
ENTRY_STORE = PostgresCollection("entries", ENTRY_DEFAULTS)
LOREBOOK_STORE = PostgresLorebookCollection("lorebooks", LOREBOOK_DEFAULTS)
STORY_STORE = PostgresStoryCollection()
USER_STORE = PostgresUserStore()

seed_legacy_json_data(
    DATA_DIR,
    USER_STORE,
    ROLE_STORE,
    PRESET_STORE,
    ENTRY_STORE,
    LOREBOOK_STORE,
    STORY_STORE,
)

router = APIRouter()


def _not_found(resource: str, item_id: int) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{resource} {item_id} not found")


def current_user_id(x_user_id: Annotated[int | None, Header(alias="X-User-Id")] = None) -> int:
    if x_user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录")
    if USER_STORE.get(x_user_id) is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录用户不存在")
    return int(x_user_id)


@router.post("/auth/register", status_code=status.HTTP_201_CREATED, response_model=AuthResponse)
def register(payload: UserRegister) -> dict:
    try:
        user = USER_STORE.create(payload.username, payload.password, payload.email)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"user": user}


@router.post("/auth/login", response_model=AuthResponse)
def login(payload: UserCredentials) -> dict:
    user = USER_STORE.authenticate(payload.username.strip(), payload.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")
    return {"user": user}


@router.get("/auth/users", response_model=list[UserPublic])
def list_users(_: int = Depends(current_user_id)) -> list[dict]:
    return USER_STORE.list_all()


@router.get("/roles", response_model=list[RoleRead])
def list_roles(user_id: int = Depends(current_user_id)) -> list[dict]:
    return ROLE_STORE.list_all(user_id)


@router.get("/roles/{item_id}", response_model=RoleRead)
def get_role(item_id: int, user_id: int = Depends(current_user_id)) -> dict:
    item = ROLE_STORE.get(user_id, item_id)
    if item is None:
        raise _not_found("role", item_id)
    return item


@router.post("/roles", status_code=status.HTTP_201_CREATED, response_model=RoleRead)
def create_role(payload: RoleCreate, user_id: int = Depends(current_user_id)) -> dict:
    return ROLE_STORE.create(user_id, payload.model_dump(mode="json"))


@router.put("/roles/{item_id}", response_model=RoleRead)
def replace_role(item_id: int, payload: RoleReplace, user_id: int = Depends(current_user_id)) -> dict:
    item = ROLE_STORE.replace(user_id, item_id, payload.model_dump(mode="json"))
    if item is None:
        raise _not_found("role", item_id)
    return item


@router.patch("/roles/{item_id}", response_model=RoleRead)
def patch_role(item_id: int, payload: RolePatch, user_id: int = Depends(current_user_id)) -> dict:
    item = ROLE_STORE.patch(user_id, item_id, payload.model_dump(mode="json", exclude_unset=True))
    if item is None:
        raise _not_found("role", item_id)
    return item


@router.delete("/roles/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(item_id: int, user_id: int = Depends(current_user_id)) -> None:
    if not ROLE_STORE.delete(user_id, item_id):
        raise _not_found("role", item_id)


@router.get("/presets", response_model=list[PresetRead])
def list_presets(user_id: int = Depends(current_user_id)) -> list[dict]:
    return PRESET_STORE.list_all(user_id)


@router.get("/presets/{item_id}", response_model=PresetRead)
def get_preset(item_id: int, user_id: int = Depends(current_user_id)) -> dict:
    item = PRESET_STORE.get(user_id, item_id)
    if item is None:
        raise _not_found("preset", item_id)
    return item


@router.post("/presets", status_code=status.HTTP_201_CREATED, response_model=PresetRead)
def create_preset(payload: PresetCreate, user_id: int = Depends(current_user_id)) -> dict:
    return PRESET_STORE.create(user_id, payload.model_dump(mode="json"))


@router.put("/presets/{item_id}", response_model=PresetRead)
def replace_preset(item_id: int, payload: PresetReplace, user_id: int = Depends(current_user_id)) -> dict:
    item = PRESET_STORE.replace(user_id, item_id, payload.model_dump(mode="json"))
    if item is None:
        raise _not_found("preset", item_id)
    return item


@router.patch("/presets/{item_id}", response_model=PresetRead)
def patch_preset(item_id: int, payload: PresetPatch, user_id: int = Depends(current_user_id)) -> dict:
    item = PRESET_STORE.patch(user_id, item_id, payload.model_dump(mode="json", exclude_unset=True))
    if item is None:
        raise _not_found("preset", item_id)
    return item


@router.delete("/presets/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_preset(item_id: int, user_id: int = Depends(current_user_id)) -> None:
    if not PRESET_STORE.delete(user_id, item_id):
        raise _not_found("preset", item_id)


@router.get("/entries", response_model=list[EntryRead])
def list_entries(user_id: int = Depends(current_user_id)) -> list[dict]:
    return ENTRY_STORE.list_all(user_id)


@router.get("/entries/{item_id}", response_model=EntryRead)
def get_entry(item_id: int, user_id: int = Depends(current_user_id)) -> dict:
    item = ENTRY_STORE.get(user_id, item_id)
    if item is None:
        raise _not_found("entry", item_id)
    return item


@router.post("/entries", status_code=status.HTTP_201_CREATED, response_model=EntryRead)
def create_entry(payload: EntryCreate, user_id: int = Depends(current_user_id)) -> dict:
    return ENTRY_STORE.create(user_id, payload.model_dump(mode="json"))


@router.put("/entries/{item_id}", response_model=EntryRead)
def replace_entry(item_id: int, payload: EntryReplace, user_id: int = Depends(current_user_id)) -> dict:
    item = ENTRY_STORE.replace(user_id, item_id, payload.model_dump(mode="json"))
    if item is None:
        raise _not_found("entry", item_id)
    return item


@router.patch("/entries/{item_id}", response_model=EntryRead)
def patch_entry(item_id: int, payload: EntryPatch, user_id: int = Depends(current_user_id)) -> dict:
    item = ENTRY_STORE.patch(user_id, item_id, payload.model_dump(mode="json", exclude_unset=True))
    if item is None:
        raise _not_found("entry", item_id)
    return item


@router.delete("/entries/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(item_id: int, user_id: int = Depends(current_user_id)) -> None:
    if not ENTRY_STORE.delete(user_id, item_id):
        raise _not_found("entry", item_id)


@router.get("/lorebooks", response_model=list[LorebookRead])
def list_lorebooks(user_id: int = Depends(current_user_id)) -> list[dict]:
    return LOREBOOK_STORE.list_all(user_id)


@router.get("/lorebooks/{item_id}", response_model=LorebookRead)
def get_lorebook(item_id: int, user_id: int = Depends(current_user_id)) -> dict:
    item = LOREBOOK_STORE.get(user_id, item_id)
    if item is None:
        raise _not_found("lorebook", item_id)
    return item


@router.post("/lorebooks", status_code=status.HTTP_201_CREATED, response_model=LorebookRead)
def create_lorebook(payload: LorebookCreate, user_id: int = Depends(current_user_id)) -> dict:
    return LOREBOOK_STORE.create(user_id, payload.model_dump(mode="json"))


@router.put("/lorebooks/{item_id}", response_model=LorebookRead)
def replace_lorebook(item_id: int, payload: LorebookReplace, user_id: int = Depends(current_user_id)) -> dict:
    item = LOREBOOK_STORE.replace(user_id, item_id, payload.model_dump(mode="json"))
    if item is None:
        raise _not_found("lorebook", item_id)
    return item


@router.patch("/lorebooks/{item_id}", response_model=LorebookRead)
def patch_lorebook(item_id: int, payload: LorebookPatch, user_id: int = Depends(current_user_id)) -> dict:
    item = LOREBOOK_STORE.patch(user_id, item_id, payload.model_dump(mode="json", exclude_unset=True))
    if item is None:
        raise _not_found("lorebook", item_id)
    return item


@router.delete("/lorebooks/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lorebook(item_id: int, user_id: int = Depends(current_user_id)) -> None:
    if not LOREBOOK_STORE.delete(user_id, item_id):
        raise _not_found("lorebook", item_id)


@router.get("/lorebooks/{lorebook_id}/entries", response_model=list[EntryRead])
def list_lorebook_entries(lorebook_id: int, user_id: int = Depends(current_user_id)) -> list[dict]:
    entries = LOREBOOK_STORE.list_entries(user_id, lorebook_id)
    if entries is None:
        raise _not_found("lorebook", lorebook_id)
    return entries


@router.get("/lorebooks/{lorebook_id}/entries/{entry_id}", response_model=EntryRead)
def get_lorebook_entry(lorebook_id: int, entry_id: int, user_id: int = Depends(current_user_id)) -> dict:
    entry = LOREBOOK_STORE.get_entry(user_id, lorebook_id, entry_id)
    if entry is None:
        raise _not_found("entry", entry_id)
    return entry


@router.post("/lorebooks/{lorebook_id}/entries", status_code=status.HTTP_201_CREATED, response_model=EntryRead)
def create_lorebook_entry(lorebook_id: int, payload: EntryCreate, user_id: int = Depends(current_user_id)) -> dict:
    entry = LOREBOOK_STORE.create_entry(user_id, lorebook_id, payload.model_dump(mode="json"))
    if entry is None:
        raise _not_found("lorebook", lorebook_id)
    return entry


@router.put("/lorebooks/{lorebook_id}/entries/{entry_id}", response_model=EntryRead)
def replace_lorebook_entry(
    lorebook_id: int,
    entry_id: int,
    payload: EntryReplace,
    user_id: int = Depends(current_user_id),
) -> dict:
    entry = LOREBOOK_STORE.replace_entry(user_id, lorebook_id, entry_id, payload.model_dump(mode="json"))
    if entry is None:
        raise _not_found("entry", entry_id)
    return entry


@router.patch("/lorebooks/{lorebook_id}/entries/{entry_id}", response_model=EntryRead)
def patch_lorebook_entry(
    lorebook_id: int,
    entry_id: int,
    payload: EntryPatch,
    user_id: int = Depends(current_user_id),
) -> dict:
    entry = LOREBOOK_STORE.patch_entry(user_id, lorebook_id, entry_id, payload.model_dump(mode="json", exclude_unset=True))
    if entry is None:
        raise _not_found("entry", entry_id)
    return entry


@router.delete("/lorebooks/{lorebook_id}/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lorebook_entry(lorebook_id: int, entry_id: int, user_id: int = Depends(current_user_id)) -> None:
    if not LOREBOOK_STORE.delete_entry(user_id, lorebook_id, entry_id):
        raise _not_found("entry", entry_id)


@router.get("/stories", response_model=list[StoryRead])
def list_stories(user_id: int = Depends(current_user_id)) -> list[dict]:
    return STORY_STORE.list_all(user_id)


@router.get("/stories/{story_id}", response_model=StoryRead)
def get_story(story_id: int, user_id: int = Depends(current_user_id)) -> dict:
    item = STORY_STORE.get(user_id, story_id)
    if item is None:
        raise _not_found("story", story_id)
    return item


@router.post("/stories", status_code=status.HTTP_201_CREATED, response_model=StoryRead)
def create_story(payload: StoryCreate, user_id: int = Depends(current_user_id)) -> dict:
    return STORY_STORE.create(user_id, payload.model_dump(mode="json"))


@router.put("/stories/{story_id}", response_model=StoryRead)
def replace_story(story_id: int, payload: StoryReplace, user_id: int = Depends(current_user_id)) -> dict:
    item = STORY_STORE.replace(user_id, story_id, payload.model_dump(mode="json"))
    if item is None:
        raise _not_found("story", story_id)
    return item


@router.patch("/stories/{story_id}", response_model=StoryRead)
def patch_story(story_id: int, payload: StoryPatch, user_id: int = Depends(current_user_id)) -> dict:
    item = STORY_STORE.patch(user_id, story_id, payload.model_dump(mode="json", exclude_unset=True))
    if item is None:
        raise _not_found("story", story_id)
    return item


@router.delete("/stories/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_story(story_id: int, user_id: int = Depends(current_user_id)) -> None:
    if not STORY_STORE.delete(user_id, story_id):
        raise _not_found("story", story_id)


@router.get("/stories/{story_id}/rounds", response_model=list[dict])
def list_story_rounds(story_id: int, user_id: int = Depends(current_user_id)) -> list[dict]:
    rounds = STORY_STORE.list_rounds(user_id, story_id)
    if rounds is None:
        raise _not_found("story", story_id)
    return rounds


@router.get("/stories/{story_id}/rounds/{round_id}", response_model=dict)
def get_story_round(story_id: int, round_id: int, user_id: int = Depends(current_user_id)) -> dict:
    round_item = STORY_STORE.get_round(user_id, story_id, round_id)
    if round_item is None:
        raise _not_found("round", round_id)
    return round_item


@router.post("/stories/{story_id}/rounds", status_code=status.HTTP_201_CREATED, response_model=dict)
def create_story_round(story_id: int, payload: dict, user_id: int = Depends(current_user_id)) -> dict:
    round_item = STORY_STORE.create_round(user_id, story_id, payload)
    if round_item is None:
        raise _not_found("story", story_id)
    return round_item


@router.put("/stories/{story_id}/rounds/{round_id}", response_model=dict)
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


@router.patch("/stories/{story_id}/rounds/{round_id}", response_model=dict)
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


@router.delete("/stories/{story_id}/rounds/{round_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_story_round(story_id: int, round_id: int, user_id: int = Depends(current_user_id)) -> None:
    if not STORY_STORE.delete_round(user_id, story_id, round_id):
        raise _not_found("round", round_id)


@router.post("/stories/{story_id}/generate-opening", response_model=dict)
def generate_story_opening(story_id: int, user_id: int = Depends(current_user_id)) -> dict:
    from app.services.story_engine import generate_opening_scene

    story = STORY_STORE.get(user_id, story_id)
    if story is None:
        raise _not_found("story", story_id)
    try:
        return generate_opening_scene(story)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"LLM 调用失败: {exc}") from exc


@router.post("/stories/{story_id}/generate-round", response_model=dict)
def generate_story_round(story_id: int, user_id: int = Depends(current_user_id)) -> dict:
    from app.services.story_engine import generate_next_round

    story = STORY_STORE.get(user_id, story_id)
    if story is None:
        raise _not_found("story", story_id)
    try:
        result = generate_next_round(STORY_STORE, user_id, story_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"LLM 调用失败: {exc}") from exc
    if result is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="生成轮次失败")
    return result
