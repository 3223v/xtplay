from __future__ import annotations

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as v1_router


app = FastAPI(title="xtplay_b API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router, prefix="/api/v1")


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "xtplay_b API is running"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}