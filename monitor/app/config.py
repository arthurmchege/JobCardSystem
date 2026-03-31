from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings (BaseSettings):
  # monitor server
  monitor_port: int = 8001
  secret_key: str

  # Alert email settings
  alert_email_from: str = "Job Card System Monitor <arthurmulunda941@gmail.com>"
  alert_email_password: str
  alert_email_to: str
  email_host: str = "smtp.gmail.com"
  email_port: int = 587

  # How often to poll docker for updates (in sseconds)
  poll_interval: int = 5

  class Config:
    env_file = ".env"
    env_file_encoding = "utf-8"

@lru_cache()
def get_settings():
  return Settings()

settings = get_settings()