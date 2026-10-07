"""
app/modules/disclosures/models.py
SQLAlchemy model for Type 3 Disclosure Forms (spec §46).

Disclosures are org-level, period-scoped, section-partitioned records containing
structured JSON payloads for:
  - BU level: targets, initiatives, BU-specific data (spec §23)
  - Subsidiary level: Section A (org info), Section B (management), Section C (performance) (spec §26-32)
  - Group level: group policies, governance, assurance, reporting boundary (spec §34-36)

Key design decisions:
  - JSON payload approach allows section schemas to evolve without migration
  - payload_version field enables backwards-compatible schema changes
  - Unique constraint ensures one record per org+period+level+section
  - Status field tracks disclosure lifecycle (DRAFT → SUBMITTED → APPROVED → LOCKED)
"""
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin


class DisclosureLevel(str, enum.Enum):
    """The organizational level at which this disclosure is entered (spec §46 Type 3)."""
    BU         = "bu"           # Business Unit level: targets, initiatives (spec §23)
    SUBSIDIARY = "subsidiary"   # Subsidiary level: Section A/B/C, org info (spec §26-32)
    GROUP      = "group"        # Group level: policies, governance, assurance (spec §34-36)


class DisclosureSection(str, enum.Enum):
    """The logical section within a disclosure level."""
    # ── BU sections ────────────────────────────────────────────────────────────
    BU_GENERAL            = "bu_general"           # BU info, business unit description
    BU_TARGETS            = "bu_targets"           # Energy/water/emissions reduction targets
    BU_INITIATIVES        = "bu_initiatives"       # ESG initiatives and programs
    BU_GOVERNANCE         = "bu_governance"        # BU-level governance info
    BU_POLICIES           = "bu_policies"          # BU-level policies

    # ── Subsidiary sections ───────────────────────────────────────────────────
    # Section A (spec §29) — General Disclosures
    SECTION_A_ORG         = "section_a_org"          # 1. Organization info (listed entity, CIN, year)
    SECTION_A_PRODUCTS    = "section_a_products"     # 2. Products & Services
    SECTION_A_OPERATIONS  = "section_a_operations"   # 3. Operations (plants, offices, locations)
    SECTION_A_EMPLOYEES   = "section_a_employees"    # 4. Employees & Workers (headcount)
    SECTION_A_GROUP_REL   = "section_a_group_rel"    # 5. Group relationships (holding/associates/JVs)
    SECTION_A_CSR         = "section_a_csr"          # 6. CSR (spend, activities, policy)
    SECTION_A_TRANSPARENCY = "section_a_transparency" # 7. Transparency & Compliance

    # Section B (spec §30) — Management & Process Disclosures
    SECTION_B_PRINCIPLE_1 = "section_b_p1"   # Ethics & Transparency
    SECTION_B_PRINCIPLE_2 = "section_b_p2"   # Product life-cycle sustainability
    SECTION_B_PRINCIPLE_3 = "section_b_p3"   # Employee well-being
    SECTION_B_PRINCIPLE_4 = "section_b_p4"   # Stakeholder engagement
    SECTION_B_PRINCIPLE_5 = "section_b_p5"   # Human rights
    SECTION_B_PRINCIPLE_6 = "section_b_p6"   # Environment
    SECTION_B_PRINCIPLE_7 = "section_b_p7"   # Policy advocacy
    SECTION_B_PRINCIPLE_8 = "section_b_p8"   # Inclusive growth
    SECTION_B_PRINCIPLE_9 = "section_b_p9"   # Customer responsibility

    # Section C overrides (spec §32) — when a metric cannot be derived from project/BU data
    SECTION_C_OVERRIDES   = "section_c_overrides"  # Subsidiary-owned indicators

    # ── Group sections ────────────────────────────────────────────────────────
    GROUP_GENERAL         = "group_general"        # Reporting boundary, group info (spec §36)
    GROUP_POLICIES        = "group_policies"       # Group-wide policies
    GROUP_TARGETS         = "group_targets"        # Group-level ESG targets
    GROUP_GOVERNANCE      = "group_governance"     # Board governance, committees
    GROUP_ASSURANCE       = "group_assurance"      # Third-party assurance information
    GROUP_OTHER           = "group_other"          # Other group-level disclosures


class DisclosureStatus(str, enum.Enum):
    DRAFT     = "DRAFT"
    SUBMITTED = "SUBMITTED"
    APPROVED  = "APPROVED"
    LOCKED    = "LOCKED"


class OrgLevelDisclosure(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    Type 3 Disclosure Form record (spec §46).

    Stores structured disclosures for information that GENUINELY BELONGS to
    a specific organizational level (BU / Subsidiary / Group).
    This is intentionally separate from:
      - Type 1 (Collection): project raw operational data in Submission + DataPoint
      - Type 2 (Review): workflow review decisions in Submission status + review notes

    Each record covers one (org_node, period, disclosure_level, disclosure_section) combination.
    The JSON payload schema is validated at the application layer.
    """
    __tablename__ = "org_level_disclosures"

    org_node_id = Column(
        PG_UUID(as_uuid=False),
        ForeignKey("org_nodes.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    period_id = Column(
        PG_UUID(as_uuid=False),
        ForeignKey("reporting_periods.id", ondelete="SET NULL"),
        nullable=True, index=True
    )

    # Level: which tier is this disclosure from? (bu / subsidiary / group)
    disclosure_level = Column(String(20), nullable=False, index=True)

    # Section: which sub-section is this? (section_a_org, bu_targets, group_governance, etc.)
    disclosure_section = Column(String(50), nullable=False, index=True)

    # Payload: structured JSON. Schema is versioned via payload_version.
    payload = Column(JSONB, nullable=False, default=dict)
    payload_version = Column(String(20), nullable=False, default="v1")

    # Lifecycle status
    status = Column(String(30), nullable=False, default=DisclosureStatus.DRAFT.value, index=True)

    # Audit trail
    submitted_by_id = Column(PG_UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    submitted_at    = Column(DateTime(timezone=True), nullable=True)
    approved_by_id  = Column(PG_UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at     = Column(DateTime(timezone=True), nullable=True)
    notes           = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "org_node_id", "period_id", "disclosure_level", "disclosure_section",
            name="uq_org_period_disclosure_section"
        ),
        Index("ix_disclosures_org_period", "org_node_id", "period_id"),
    )


class CalculationJob(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Background calculation pipeline job status tracker (spec §48).

    When a project approval triggers recalculation, a CalculationJob is created
    to track each pipeline stage:
      project_calc → bu_aggregation → subsidiary_aggregation → group_aggregation → report_generation

    The frontend polls this table to show the pipeline status UX (spec §48).
    On completion, affected reports are marked stale (spec §49).
    """
    __tablename__ = "calculation_jobs"

    # What triggered this calculation?
    trigger_event = Column(String(100), nullable=False)
    # Values: "submission_approved" | "bu_approved" | "subsidiary_approved" | "manual" | "period_close"

    org_node_id  = Column(PG_UUID(as_uuid=False), ForeignKey("org_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    period_id    = Column(PG_UUID(as_uuid=False), ForeignKey("reporting_periods.id", ondelete="SET NULL"), nullable=True, index=True)
    initiated_by_id = Column(PG_UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Pipeline stage statuses (spec §48)
    # Schema: {"project_calc": "DONE", "bu_aggregation": "RUNNING", "subsidiary_aggregation": "WAITING", ...}
    # Stage values: "WAITING" | "QUEUED" | "RUNNING" | "DONE" | "FAILED" | "SKIPPED"
    pipeline_status = Column(JSONB, nullable=False, default=dict)

    overall_status = Column(String(30), nullable=False, default="QUEUED", index=True)
    # Values: "QUEUED" | "RUNNING" | "COMPLETE" | "FAILED" | "PARTIAL"

    methodology_version = Column(String(20), nullable=True)
    started_at          = Column(DateTime(timezone=True), nullable=True)
    completed_at        = Column(DateTime(timezone=True), nullable=True)
    error_message       = Column(Text, nullable=True)

    # List of report IDs marked stale when this job ran (spec §49)
    affected_reports = Column(JSONB, nullable=False, default=list)
