from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = Field(
        default="postgresql+psycopg://kawsay:kawsay@localhost:5432/kawsay",
        description="PostgreSQL connection URL; SQLite is not supported as central storage.",
    )
    jwt_secret: str = "development-only-change-me"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30
    cors_origins: str = "http://localhost:5173,http://localhost:5174"
    ai_provider: str = "mock"
    ai_api_key: str = ""
    log_level: str = "INFO"
    request_timeout_seconds: float = 30.0
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_list(self) -> list[str]:
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]

    def validate_database(self) -> None:
        if not self.database_url.startswith("postgresql"):
            raise ValueError("DATABASE_URL debe apuntar a PostgreSQL; SQLite no es base central válida")

settings = Settings()
if settings.app_env == "production":
    settings.validate_database()
    if settings.jwt_secret == "development-only-change-me":
        raise ValueError("JWT_SECRET de desarrollo no puede usarse en producción")
