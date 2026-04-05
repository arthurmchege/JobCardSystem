import asyncio
from app import database

async def get_activity_logs():
  logs = await database.pool.fetch(
    """SELECT id,
      event_type,
        user_id,
          metadata,
            created_at
              FROM activity_logs
              ORDER BY created_at DESC LIMIT 20
        """
  )

  return logs