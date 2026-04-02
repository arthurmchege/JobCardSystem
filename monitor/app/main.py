from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket
from app.config import settings
from app.docker_monitor import get_docker_status
from app.system_monitor import get_system_status
from app.websocket_manager import manager
import asyncio
from app.health_checker import health_check_loop
from app.database import init_db
@asynccontextmanager
async def lifespan(app):
    await init_db()
    asyncio.create_task(health_check_loop())
    yield

app = FastAPI(title="Monitor Service", version="1.0.0", lifespan=lifespan)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "monitor"}

@app.get("/docker-status")
async def docker_status():
  status = get_docker_status()
  return status

@app.get("/system-status")
async def system_status():
  status = get_system_status()
  return status

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
  await websocket.accept()
  manager.connect(websocket)
  try:
      while True:
         await asyncio.sleep(5)
         data = get_docker_status()
         await manager.broadcast(data)
  except:
    manager.disconnect(websocket)

