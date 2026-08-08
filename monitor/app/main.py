from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from app.config import settings
from app.docker_monitor import get_docker_status
from app.system_monitor import get_system_status
from app.websocket_manager import manager
import asyncio
from app.health_checker import health_check_loop
from app.summary import get_monitoring_summary
from app.activity_logs import get_activity_logs
from app import database
@asynccontextmanager
async def lifespan(app):
    await database.init_db()
    asyncio.create_task(health_check_loop())
    yield
    await database.pool.close()

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
  except WebSocketDisconnect:
    manager.disconnect(websocket)

@app.get("/summary")
async def monitoring_summary():
   summary = await get_monitoring_summary()
   return summary

@app.get("/activity-logs")
async def activity_logs():
   logs = await get_activity_logs()
   return logs