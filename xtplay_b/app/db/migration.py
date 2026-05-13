
from __future__ import annotations

from .base import connect
from .schema import init_db
from psycopg.types.json import Jsonb


def migrate_story_rounds_to_sessions() -> None:
    """One-time migration: create default sessions for stories with old-style rounds."""
    with connect() as conn:
        rows = conn.execute("""
            SELECT DISTINCT s.id, s.user_id, s.data
            FROM stories s
            JOIN story_rounds sr ON sr.story_id = s.id
            WHERE NOT EXISTS (
                SELECT 1 FROM story_sessions ss
                WHERE ss.story_id = s.id AND ss.user_id = s.user_id
            )
        """).fetchall()

        for row in rows:
            story_data = row["data"] or {}
            story_title = str(story_data.get("title", "") or "默认会话")
            session_data = {"title": story_title, "status": "active"}
            session_row = conn.execute(
                """
                insert into story_sessions (user_id, story_id, data)
                values (%s, %s, %s)
                returning id
                """,
                (row["user_id"], row["id"], Jsonb(session_data)),
            ).fetchone()
            session_id = int(session_row["id"])

            rounds = conn.execute(
                """
                select position, data
                from story_rounds
                where story_id = %s and user_id = %s
                order by position, id
                """,
                (row["id"], row["user_id"]),
            ).fetchall()

            for rnd in rounds:
                conn.execute(
                    """
                    insert into session_rounds (user_id, session_id, position, data)
                    values (%s, %s, %s, %s)
                    """,
                    (row["user_id"], session_id, int(rnd["position"]), Jsonb(rnd["data"])),
                )

