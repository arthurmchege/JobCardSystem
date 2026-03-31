from fastapi import FastAPI
from app.config import settings
from app.docker_monitor import get_docker_status

app = FastAPI(
  title="Monitor Service",
  version="1.0.0"
)
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "monitor"}

@app.get("/docker-status")
async def docker_status():
  status = get_docker_status()
  return status