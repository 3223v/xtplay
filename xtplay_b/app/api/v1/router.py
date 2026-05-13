
from __future__ import annotations

from fastapi import APIRouter

from app.db import (
    PostgresCollection,
    PostgresLorebookCollection,
    PostgresPromptStore,
    PostgresSessionStore,
    PostgresStoryCollection,
    PostgresUserStore,
    init_db,
    migrate_story_rounds_to_sessions,
)
from app.db.base import ROLE_DEFAULTS, PRESET_DEFAULTS, ENTRY_DEFAULTS, LOREBOOK_DEFAULTS
from app.services.prompt_registry import DEFAULT_PROMPTS, load_prompt_cache

from . import (
    auth,
    entries,
    lorebooks,
    presets,
    prompts,
    roles,
    sessions,
    stories,
    tts,
)

# Initialize DB once
init_db()

# Initialize and seed prompt store
prompt_store = PostgresPromptStore()
prompt_store.seed_defaults(DEFAULT_PROMPTS)
load_prompt_cache(prompt_store)

# Run migrations once
migrate_story_rounds_to_sessions()

router = APIRouter()

# Include all sub-routers
router.include_router(auth.router)
router.include_router(prompts.router)
router.include_router(roles.router)
router.include_router(presets.router)
router.include_router(entries.router)
router.include_router(lorebooks.router)
router.include_router(stories.router)
router.include_router(sessions.router)
router.include_router(tts.router)

