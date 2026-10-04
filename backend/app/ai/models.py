import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Numeric, Integer, DateTime, JSON, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from app.db.base import Base, UUIDPrimaryKeyMixin, TimestampMixin
from app.ai.schemas import AIRunStatus, AIEngineType


class AIRun(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    ai_runs audit table as specified in MEIL BRSR Build Guide.
    Tracks every AI call: model, prompt version, input, output, confidence, citations, latency, and human decision.
    """
    __tablename__ = "ai_runs"

    engine = Column(String(50), nullable=False)  # E1, E2, E3, E4, E5, E6, E7
    model = Column(String(100), nullable=False)
    model_version = Column(String(50), nullable=True)
    prompt_version = Column(String(50), nullable=False, default="v1.0")
    
    input_ref = Column(String(255), nullable=True)  # File path, metric ID, or request hash
    output = Column(JSONB, nullable=False)          # Structured output JSON
    confidence = Column(Numeric(precision=5, scale=4), nullable=True)
    citations = Column(JSONB, nullable=True)        # Grounded citations
    latency_ms = Column(Integer, nullable=True)
    
    status = Column(String(50), nullable=False, default=AIRunStatus.PROPOSED.value)
    reviewer_id = Column(PG_UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    final_ref = Column(String(255), nullable=True)  # Reference to confirmed data_point if accepted

    def to_dict(self):
        return {
            "id": str(self.id),
            "engine": self.engine,
            "model": self.model,
            "model_version": self.model_version,
            "prompt_version": self.prompt_version,
            "input_ref": self.input_ref,
            "output": self.output,
            "confidence": float(self.confidence) if self.confidence is not None else None,
            "citations": self.citations,
            "latency_ms": self.latency_ms,
            "status": self.status,
            "reviewer_id": str(self.reviewer_id) if self.reviewer_id else None,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "final_ref": self.final_ref,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
