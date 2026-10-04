"""
app/ai/__init__.py
7 AI Engines for SEBI BRSR Automation:
  - Engine 1: Vision OCR & Evidence Extraction (E1)
  - Engine 2: Real-time Data Anomaly Detection (E2)
  - Engine 3: Standards RAG & Guidance Assistant (E3)
  - Engine 4: Policy & Gap Evaluation (E4)
  - Engine 5: Narrative & Executive Draft Generation (E5)
  - Engine 6: Value Chain Partner Screening (E6)
  - Engine 7: 3-Click Explainability & Formula Provenance (E7)
"""
from app.ai.router import router

__all__ = ["router"]
