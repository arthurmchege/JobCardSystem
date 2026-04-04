import httpx
from app.config import settings
import time
from app import database
import asyncio

async def check_backend_health():
  try:
    start = time.time()
    async with httpx.AsyncClient() as client:
      response = await client.get(settings.express_backend_url + "/api/v1/health")
      response_time_ms = int ((time.time() - start) * 1000)
      print(f"Backend is healthy: {response.status_code}")
      await database.pool.execute("INSERT INTO health_check_logs (service_name, response_time_ms, status_code, status, error_message) VALUES ($1, $2, $3, $4, $5)", "backend",response_time_ms, response.status_code, "healthy", None)
      return response.status_code == 200
  except Exception as e:
      print(f"Backend is down: {e}")
      await database.pool.execute(
        "INSERT INTO health_check_logs (service_name, status, error_message) VALUES ($1, $2, $3)", 
        "backend", "down", str(e)
      )

async def health_check_loop():
  while True:
    await check_backend_health()
    await asyncio.sleep(30)