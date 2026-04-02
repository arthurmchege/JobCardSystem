import httpx
from app.config import settings
import asyncio

async def check_backend_health():
  try:
    async with httpx.AsyncClient() as client:
      response = await client.get(settings.express_backend_url + "/api/v1/health")
      print(f"Backend is healthy: {response.status_code}")
      return response.status_code == 200
  except Exception as e:
    print(f"Backend is down: {e}")
    
async def health_check_loop():
    while True:
      await check_backend_health()
      await asyncio.sleep(30)