import os
from typing import Optional, List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_ENV_PATHS = [
    ".env",
    "backend/.env",
    os.path.join(_BACKEND_DIR, ".env"),
    os.path.join(os.getcwd(), ".env"),
    os.path.join(os.getcwd(), "backend", ".env"),
]

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_PATHS,
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Application
    APP_NAME: str = "Aarohan ESG Platform"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # Database & Storage
    DATABASE_URL: str = "postgresql+psycopg://postgres:SKIT025@localhost:5432/brsr_db"
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
    OPENROUTER_MODEL_TEXT: str = "meta-llama/llama-3.1-8b-instruct"
    OPENROUTER_MODEL_VISION: str = "google/gemini-3.8-flash"
    AI_FALLBACK_TO_MOCK: bool = True
    AI_AUTO_FALLBACK_ON_ERROR: bool = True
    AI_MODEL_VISION: str = "models/gemini-3.8-flash"
    AI_MODEL_TEXT: str = "models/gemini-3.8-flash"
    AI_EMBEDDING_MODEL: str = "models/text-embedding-004"

    # SMTP Email Configuration (Google Mail / Gmail Provider)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = "placeholder@gmail.com"
    SMTP_PASSWORD: Optional[str] = "placeholder_app_password"
    SMTP_FROM_EMAIL: str = "placeholder@gmail.com"
    SMTP_FROM_NAME: str = "MEIL AAROHAN Platform"
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False

    # Email Invitation & Platform URLs
    EMAIL_SENDER_ADDRESS: str = "placeholder@gmail.com"
    EMAIL_SENDER_NAME: str = "MEIL AAROHAN Platform"
    FRONTEND_BASE_URL: str = "http://localhost:5173"
    
    # Optional Legacy/Fallback Providers
    RESEND_API_KEY: Optional[str] = None
    FIREBASE_CREDENTIALS_PATH: Optional[str] = None
    FIREBASE_PROJECT_ID: Optional[str] = None

settings = Settings()
