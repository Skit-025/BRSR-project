"""
app/config/feature_flags.py
Dynamic and environment-based feature flags for BRSR system capabilities.
"""
from pydantic import BaseModel
import os


class FeatureFlags(BaseModel):
    # Pipeline & Processing flags
    ENABLE_AI_AUTO_VALIDATION: bool = True
    ENABLE_REALTIME_ANOMALY_DETECTION: bool = True
    ENABLE_ASYNC_CELERY_PIPELINES: bool = True
    ENABLE_MERKLE_AUDIT_PROOFS: bool = True
    ENABLE_POSTGRES_ROW_LEVEL_SECURITY: bool = True

    # SEBI Framework features
    ENABLE_BRSR_CORE_SUBSET: bool = True
    ENABLE_VALUE_CHAIN_ASSESSMENT: bool = True
    ENABLE_RESTATEMENT_ENGINE: bool = True
    ENABLE_OFFLINE_SYNC: bool = True

    # Integrations & Notifications
    ENABLE_EMAIL_NOTIFICATIONS: bool = False
    ENABLE_WHATSAPP_NOTIFICATIONS: bool = False
    ENABLE_AUDIT_PACK_PDF_WATERMARK: bool = True

    @classmethod
    def from_env(cls) -> "FeatureFlags":
        return cls(
            ENABLE_AI_AUTO_VALIDATION=os.getenv("ENABLE_AI_AUTO_VALIDATION", "true").lower() == "true",
            ENABLE_REALTIME_ANOMALY_DETECTION=os.getenv("ENABLE_REALTIME_ANOMALY_DETECTION", "true").lower() == "true",
            ENABLE_ASYNC_CELERY_PIPELINES=os.getenv("ENABLE_ASYNC_CELERY_PIPELINES", "true").lower() == "true",
            ENABLE_MERKLE_AUDIT_PROOFS=os.getenv("ENABLE_MERKLE_AUDIT_PROOFS", "true").lower() == "true",
            ENABLE_POSTGRES_ROW_LEVEL_SECURITY=os.getenv("ENABLE_POSTGRES_ROW_LEVEL_SECURITY", "true").lower() == "true",
            ENABLE_BRSR_CORE_SUBSET=os.getenv("ENABLE_BRSR_CORE_SUBSET", "true").lower() == "true",
            ENABLE_VALUE_CHAIN_ASSESSMENT=os.getenv("ENABLE_VALUE_CHAIN_ASSESSMENT", "true").lower() == "true",
            ENABLE_RESTATEMENT_ENGINE=os.getenv("ENABLE_RESTATEMENT_ENGINE", "true").lower() == "true",
            ENABLE_OFFLINE_SYNC=os.getenv("ENABLE_OFFLINE_SYNC", "true").lower() == "true",
            ENABLE_EMAIL_NOTIFICATIONS=os.getenv("ENABLE_EMAIL_NOTIFICATIONS", "false").lower() == "true",
            ENABLE_WHATSAPP_NOTIFICATIONS=os.getenv("ENABLE_WHATSAPP_NOTIFICATIONS", "false").lower() == "true",
            ENABLE_AUDIT_PACK_PDF_WATERMARK=os.getenv("ENABLE_AUDIT_PACK_PDF_WATERMARK", "true").lower() == "true",
        )


feature_flags = FeatureFlags.from_env()
