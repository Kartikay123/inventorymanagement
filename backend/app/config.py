"""Application configuration loaded from environment variables.

No credentials are hard-coded. Every value can be overridden through the
environment (see `.env.example`), which keeps the image portable across local,
Docker and cloud (Render / Railway / Fly.io) environments.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Project metadata
    APP_NAME: str = "Inventory & Order Management API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database — defaults to a local SQLite file so the app runs with zero setup.
    # In Docker / production this is overridden with a PostgreSQL URL.
    DATABASE_URL: str = "sqlite:///./inventory.db"

    # CORS — comma separated list of allowed origins, or "*" for all.
    CORS_ORIGINS: str = "*"

    # Business configuration
    LOW_STOCK_THRESHOLD: int = 10

    # Seed demo data on first startup when the database is empty.
    SEED_DATA: bool = True

    @property
    def cors_origins_list(self) -> List[str]:
        if self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
