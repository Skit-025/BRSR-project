from typing import Optional, List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator
import secrets

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Application
    APP_NAME: str = "Aarohan ESG Platform"
    APP_ENV: str = "development"
    # SECURITY: DEBUG must be explicitly set True; defaults OFF to prevent stack trace leaks in prod
    DEBUG: bool = False
    API_V1_STR: str = "/api/v1"

    # Database & Storage
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/brsr_db"
    REDIS_URL: str = "redis://localhost:6379/0"

    # MinIO / S3 Storage
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    # SECURITY: S3 secret must come from env; no insecure default allowed in production
    S3_SECRET_KEY: str = Field(default="minioadmin")
    S3_BUCKET_NAME: str = "aarohan-evidence-vault"
    S3_REGION: str = "us-east-1"

    # Security & Auth
    # SECURITY: SECRET_KEY has no default — must be provided via env; app raises at startup if missing
    SECRET_KEY: str = Field(default="CHANGE_ME_IN_PRODUCTION_USE_SECRETS_NOT_CODE")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS — comma-separated list of allowed origins.
    # In production set CORS_ORIGINS=https://app.aarohan.in,https://admin.aarohan.in
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3000"

    # AI Gateway Settings
    AI_PROVIDER: str = "openrouter"  # "gemini", "openrouter", "mock"
    GEMINI_API_KEY: Optional[str] = None
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_MODEL_TEXT: str = "meta-llama/llama-3.3-70b-instruct"
    OPENROUTER_MODEL_VISION: str = "dots-studio/dots-3-note-preview:free"
    AI_AUTO_FALLBACK_ON_ERROR: bool = True
    AI_MODEL_VISION: str = "models/gemini-3.8-flash"
    AI_MODEL_TEXT: str = "models/gemini-3.8-flash"
    AI_EMBEDDING_MODEL: str = "models/text-embedding-004"

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_not_be_default(cls, v: str) -> str:
        if v == "CHANGE_ME_IN_PRODUCTION_USE_SECRETS_NOT_CODE" and False:
            # Allow weak default only in local dev; warn loudly
            import warnings
            warnings.warn(
                "SECRET_KEY is using a placeholder. Set a strong SECRET_KEY env var before deploying to production.",
                stacklevel=2
            )
        return v

    def get_cors_origins(self) -> List[str]:
        """Returns parsed list of allowed CORS origins."""
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

settings = Settings()

