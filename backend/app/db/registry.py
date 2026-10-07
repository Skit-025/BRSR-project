"""
app/db/registry.py
Central model registry — import ALL SQLAlchemy model modules here so that
Base.metadata.create_all() can discover every table at startup.

Add a new import line whenever a new model module is created.
"""

# ── Auth ──────────────────────────────────────────────────────────
import app.modules.auth.models           # noqa: F401

# ── Organisation ─────────────────────────────────────────────────
import app.modules.org.models            # noqa: F401

# ── Metrics ──────────────────────────────────────────────────────
import app.modules.metrics.models        # noqa: F401

# ── Collection / Submission ───────────────────────────────────────
import app.modules.collection.models     # noqa: F401

# ── Evidence ─────────────────────────────────────────────────────
import app.modules.evidence.models       # noqa: F401

# ── Validation & Exceptions ──────────────────────────────────────
import app.modules.validation.models     # noqa: F401
import app.modules.validation.exceptions.models  # noqa: F401

# ── Workflow ─────────────────────────────────────────────────────
import app.modules.workflow.models       # noqa: F401

# ── Consolidation ────────────────────────────────────────────────
import app.modules.consolidation.models  # noqa: F401

# ── Reporting ────────────────────────────────────────────────────
import app.modules.reporting.models      # noqa: F401

# ── Pipelines / Outbox ───────────────────────────────────────────
import app.pipelines.outbox.models       # noqa: F401

# ── Audit (Immutable Cryptographic Ledger) ────────────────────────
import app.modules.audit.models          # noqa: F401

# ── Calculation Engine ───────────────────────────────────────────
import app.modules.calc.models           # noqa: F401

# ── Snapshots & Restatements ─────────────────────────────────────
import app.modules.snapshots.models      # noqa: F401

# ── Assurance & External Audit ───────────────────────────────────
import app.modules.assurance.models      # noqa: F401

# ── Value Chain ──────────────────────────────────────────────────
import app.modules.valuechain.models     # noqa: F401

# ── Background Jobs ──────────────────────────────────────────────
import app.modules.admin.jobs.models     # noqa: F401

# ── Notifications ────────────────────────────────────────────────
import app.modules.notifications.models  # noqa: F401

# ── AI Governance & Runs ─────────────────────────────────────────
import app.ai.models                         # noqa: F401

# ── Type 3 Org-Level Disclosures & Calc Pipeline ─────────────────
import app.modules.disclosures.models         # noqa: F401

