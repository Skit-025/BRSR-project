"""
app/api.py
Central FastAPI APIRouter aggregating all domain modules, AI engines, and pipeline endpoints.
"""
from fastapi import APIRouter
from app.ai.router import router as ai_router
from app.modules.auth.router import router as auth_router
from app.modules.org.router import router as org_router
from app.modules.metrics.router import router as metrics_router
from app.modules.forms.router import router as forms_router
from app.modules.collection.router import router as collection_router
from app.modules.collection.offline_sync.router import router as offline_sync_router
from app.modules.evidence.router import router as evidence_router
from app.modules.validation.router import router as validation_router
from app.modules.validation.exceptions.router import router as validation_exceptions_router
from app.modules.workflow.router import router as workflow_router
from app.modules.consolidation.router import router as consolidation_router
from app.modules.lineage.router import router as lineage_router
from app.modules.reporting.router import router as reporting_router
from app.modules.calc.router import router as calc_router
from app.modules.audit.router import router as audit_router
from app.modules.dashboards.router import router as dashboards_router
from app.modules.snapshots.router import router as snapshots_router
from app.modules.assurance.router import router as assurance_router
from app.modules.valuechain.router import router as valuechain_router
from app.modules.admin.router import router as admin_router
from app.modules.notifications.router import router as notifications_router

api_router = APIRouter()

# Authentication & User Management
api_router.include_router(auth_router)

# Organization Hierarchy & Applicability
api_router.include_router(org_router)

# Metric Catalogue & Dynamic Forms
api_router.include_router(metrics_router)
api_router.include_router(forms_router)


# Data Collection & Monthly Submissions
api_router.include_router(collection_router)
api_router.include_router(offline_sync_router)

# Evidence Vault & Storage
api_router.include_router(evidence_router)

# Deterministic Validation & Exceptions
api_router.include_router(validation_router)
api_router.include_router(validation_exceptions_router)

# Four-Eyes Maker-Checker Workflow & SLA
api_router.include_router(workflow_router)

# Multi-Tier Boundary Consolidation
api_router.include_router(consolidation_router)

# Calculation Engine & Statutory Formulas
api_router.include_router(calc_router)

# Cryptographic Immutable Audit Trail
api_router.include_router(audit_router)

# 3-Click Lineage & Provenance Explorer
api_router.include_router(lineage_router)

# Executive Dashboards & Data Quality Scores
api_router.include_router(dashboards_router)

# Reporting Snapshots & Restatements
api_router.include_router(snapshots_router)

# SEBI Disclosures & Audit Pack Compilation
api_router.include_router(reporting_router)

# Reasonable Assurance & Auditor Workpapers
api_router.include_router(assurance_router)

# Value Chain ESG Disclosures (Top 75% Rule)
api_router.include_router(valuechain_router)

# System Diagnostics & Background Jobs
api_router.include_router(admin_router)

# Multi-Channel Notifications (In-App, Email, WhatsApp)
api_router.include_router(notifications_router)

# 7 AI Engines (OCR, Anomaly, RAG, Policy, Narrative, ValueChain, Explainer)
api_router.include_router(ai_router)
