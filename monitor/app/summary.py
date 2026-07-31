import asyncio
from app import database

async def get_monitoring_summary():
  query = await database.pool.fetch(
    """SELECT
      id,                                                                                         
        service_name,
          status,
            status_code,
              response_time_ms,
                error_message,
                  checked_at
                    FROM health_check_logs
                    ORDER BY checked_at DESC LIMIT 1
                      """  )
  latest = query[0]
  stats = await database.pool.fetchrow(
    """ SELECT
      COUNT(*) AS total_count,
      COUNT(*) FILTER (WHERE status = 'healthy') AS healthy_count
      FROM health_check_logs"""
    )
  avg_ms = await database.pool.fetchrow(
    """ SELECT
      AVG(response_time_ms) AS avg_response_time_ms
      FROM health_check_logs"""
  )
  return {
    "current_status": latest["status"],
    "last_checked": latest["checked_at"],
    "uptime_percent": round(int((stats["healthy_count"]) / int(stats["total_count"]) * 100)),
    "avg_response_time_ms": float(avg_ms["avg_response_time_ms"])
  }