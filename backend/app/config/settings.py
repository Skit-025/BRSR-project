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
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 45
    REFRESH_TOKEN_EXPIRE_DAYS: int = 0

    # AI Gateway Settings
    # Cascade order = AI_PROVIDER first, then AI_PROVIDER_FALLBACKS (left to right).
    AI_PROVIDER: str = "huggingface"  # "huggingface" | "gemini" | "openrouter" | "mock"
    AI_PROVIDER_FALLBACKS: str = "openrouter,gemini"
    AI_PROVIDER_COOLDOWN_SECONDS: int = 60
    AI_PROVIDER_FAILURE_THRESHOLD: int = 2

    # Hugging Face Inference Providers (PRIMARY — https://huggingface.co/settings/tokens)
    HF_API_KEY: Optional[str] = None
    HF_TOKEN: Optional[str] = None
    HF_ROUTER_BASE_URL: str = "https://router.huggingface.co/v1"
    HF_INFERENCE_BASE_URL: str = "https://router.huggingface.co/hf-inference"
    HF_MODEL_TEXT: str = "openai/gpt-oss-120b"
    HF_MODEL_TEXT_FALLBACKS: str = (
        "Qwen/Qwen3-32B,"
        "meta-llama/Llama-3.3-70B-Instruct,"
        "meta-llama/Llama-3.1-8B-Instruct"
    )
    HF_MODEL_VISION: str = "Qwen/Qwen3-VL-30B-A3B-Instruct"
    HF_MODEL_VISION_FALLBACKS: str = (
        "meta-llama/Llama-4-Scout-17B-16E-Instruct,"
        "zai-org/GLM-4.5V,"
        "Qwen/Qwen2.5-VL-7B-Instruct"
    )
    HF_EMBEDDING_MODEL: str = "BAAI/bge-base-en-v1.5"
    HF_PROVIDER: str = ""          # optional pin: "auto" | "fastest" | "groq" | "together" | ...
    HF_MAX_RETRIES: int = 1         # retries per model on 429/5xx (503 cold-start is transient)
    HF_TIMEOUT_SECONDS: int = 120   # per HTTP request
    HF_TOTAL_TIMEOUT_SECONDS: int = 150  # whole HF provider attempt before failing over
    HF_MAX_TOKENS: int = 4096
    HF_TEMPERATURE: float = 0.1

    GEMINI_API_KEY: Optional[str] = None
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_MODEL_TEXT: str = "openai/gpt-oss-120b"
    OPENROUTER_MODEL_VISION: str = "google/gemma-3-12b-it"
    AI_FALLBACK_TO_MOCK: bool = True
    AI_AUTO_FALLBACK_ON_ERROR: bool = True
    AI_MODEL_VISION: str = "gemini-flash-latest"
    AI_MODEL_TEXT: str = "gemini-flash-latest"
    AI_EMBEDDING_MODEL: str = "gemini-embedding-001"

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

settings = Settings()
