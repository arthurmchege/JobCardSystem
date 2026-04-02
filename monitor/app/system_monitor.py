from psutil import cpu_percent, virtual_memory, disk_usage

def get_system_status():
  mem = virtual_memory()
  disk = disk_usage('/')
  return {
    "cpu": { "total": 0, "used": 0, "percent": cpu_percent(interval=1) },
    "memory": { "total": mem.total, "used": mem.used, "percent": mem.percent },
    "disk": { "total": disk.total, "used": disk.used, "percent": disk.percent }
  }