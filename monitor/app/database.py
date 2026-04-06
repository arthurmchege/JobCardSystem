import asyncpg
from app.config import settings

pool = None

async def init_db():
  global pool
  pool = await asyncpg.create_pool(settings.database_url)

