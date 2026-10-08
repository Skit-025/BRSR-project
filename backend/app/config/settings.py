from typing import Optional, List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Application
    APP_NAME: str = "Aarohan ESG Platform"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # Database & Storage
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/brsr_db"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # MinIO / S3 Storage
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET_NAME: str = "aarohan-evidence-vault"
    S3_REGION: str = "us-east-1"

    # Security & Auth
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # AI Gateway Settings
    AI_PROVIDER: str = "openrouter"  # "gemini", "openrouter", "mock"
    GEMINI_API_KEY: Optional[str] = None
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_MODEL_TEXT: str = "meta-llama/llama-3.3-70b-instruct"
    OPENROUTER_MODEL_VISION: str = "inclusionai/ling-3.0-flash-vl"
    AI_FALLBACK_TO_MOCK: bool = False
    AI_AUTO_FALLBACK_ON_ERROR: bool = False
    AI_MODEL_VISION: str = "models/gemini-flash-latest"
    AI_MODEL_TEXT: str = "models/gemini-flash-latest"
    AI_EMBEDDING_MODEL: str = "models/text-embedding-004"

settings = Settings()
