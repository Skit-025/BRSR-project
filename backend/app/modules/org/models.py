import enum
from sqlalchemy import Column, String, Numeric, Boolean, Integer, Date, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.types import UserDefinedType
from sqlalchemy.orm import relationship
from app.db.base import Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin


class LtreeType(UserDefinedType):
    """PostgreSQL native LTREE data type for recursive hierarchical trees."""
    def get_col_spec(self, **kw):
        return "LTREE"

    def bind_processor(self, dialect):
        def process(value):
            return str(value) if value is not None else None
        return process

    def result_processor(self, dialect, coltype):
        def process(value):
            return str(value) if value is not None else None
        return process


class NodeType(str, enum.Enum):
    # ── 4 Primary Hierarchy Levels (MEIL Director's Requirement) ──
    GROUP = "group"                    # Level 1: Group Root (e.g. MEIL)
    COMPANY = "company"                # Level 2: Operating Companies
    BUSINESS_UNIT = "business_unit"    # Level 3: Business Units (Hydro, Solar, Roads)
    PROJECT = "project"                # Level 4: Project sites (Daily Data Entry)

    # ── Legacy / Backwards Compatibility Aliases ──
    SUBSIDIARY = "subsidiary"          # Legacy alias for Company
    ASSOCIATE = "associate"
    JV = "jv"
    SITE = "site"                      # Legacy alias for Project


class ControlType(str, enum.Enum):
    OPERATIONAL_CONTROL = "operational_control"
    FINANCIAL_CONTROL = "financial_control"
    EQUITY_SHARE = "equity_share"


class ProjectType(str, enum.Enum):
    IRRIGATION = "irrigation"
    HYDROCARBON = "hydrocarbon"
    SOLAR = "solar"
    ROAD = "road"
    TUNNEL = "tunnel"
    EV_BUS = "ev_bus"
    CORPORATE = "corporate"

    # MEIL Subsidiary & Sector Portfolio Extensions
    EV_MOBILITY = "ev_mobility"
    HYDROCARBON_CGD = "hydrocarbon_cgd"
    WATER_IRRIGATION = "water_irrigation"
    RENEWABLE_ENERGY = "renewable_energy"
    TRANSPORT_INFRA = "transport_infra"
    TELECOM_DEFENCE = "telecom_defence"
    TELECOM = "telecom"
    HEAVY_ENGINEERING = "heavy_engineering"
    CORPORATE_HOLDING = "corporate_holding"



class PeriodType(str, enum.Enum):
    FINANCIAL_YEAR = "financial_year"
    QUARTER = "quarter"
    MONTH = "month"


class PeriodStatus(str, enum.Enum):
    OPEN = "OPEN"
    LOCKED = "LOCKED"
    EXTENDED = "EXTENDED"


class OrgNode(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    Organization hierarchy node matching F01 specification:
    Group -> Subsidiary/JV -> Business Unit -> Project/Site.
    Uses adjacency (parent_id) and PostgreSQL ltree path.
    """
    __tablename__ = "org_nodes"

    code = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    type = Column(String(50), default=NodeType.PROJECT.value, nullable=False, index=True)
    parent_id = Column(PG_UUID(as_uuid=False), ForeignKey("org_nodes.id"), nullable=True, index=True)
    
    # Materialized PostgreSQL LTREE path e.g. "MEIL.HYDRO.BU1.PRJ1"
    path = Column(LtreeType(), nullable=False)
    is_root = Column(Boolean, default=False, nullable=False)
    
    # Boundary & Consolidation controls
    ownership_pct = Column(Numeric(5, 2), default=100.0, nullable=False)
    control_type = Column(String(50), default=ControlType.OPERATIONAL_CONTROL.value, nullable=False)
    boundary = Column(Boolean, default=True, nullable=False)  # Included in consolidated BRSR boundary
    
    # Temporal validity
    effective_from = Column(Date, nullable=True)
    effective_to = Column(Date, nullable=True)
    
    # Extensible attributes (turnover, capacity, employee headcount, geo-coordinates)
    attributes = Column(JSONB, default=dict, nullable=False)

    # Project profile facts for applicability derivation
    project_type = Column(String(50), default=ProjectType.CORPORATE.value, nullable=False, index=True)
    project_description = Column(Text, nullable=True)  # Plain-language description shown to site engineers
    enabled_activity_categories = Column(JSONB, default=list, nullable=False)  # e.g. ["ENV-GHG-001A","ENV-GHG-001B","ENV-GHG-002A"]
    location_state = Column(String(100), nullable=True)
    location_country = Column(String(100), default="India", nullable=False)
    is_listed = Column(Boolean, default=False, nullable=False)
    is_water_stressed = Column(Boolean, default=False, nullable=False)
    is_pat_designated = Column(Boolean, default=False, nullable=False)  # BEE PAT Scheme Designated Consumer
    has_land_acquisition = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    children = relationship("OrgNode", backref="parent", remote_side="OrgNode.id")

    __table_args__ = (
        Index("ix_org_nodes_path_gist", "path", postgresql_using="gist"),
    )


class ReportingPeriod(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    Indian FY reporting periods (Apr-Mar) with monthly entry and quarterly review.
    """
    __tablename__ = "reporting_periods"

    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. "FY2025-26-M04"
    financial_year = Column(String(20), index=True, nullable=False)    # e.g. "2025-2026"
    period_type = Column(String(20), default=PeriodType.MONTH.value, nullable=False)
    month = Column(Integer, nullable=True)                              # 1 to 12
    quarter = Column(Integer, nullable=True)                            # 1 to 4
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String(20), default=PeriodStatus.OPEN.value, nullable=False, index=True)


class MetricApplicability(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    Audited applicability decision per node, metric, and period (F03).
    Logs the exact rule and facts why a metric applies or was excluded.
    """
    __tablename__ = "metric_applicability"

    org_node_id = Column(PG_UUID(as_uuid=False), ForeignKey("org_nodes.id"), nullable=False, index=True)
    metric_code = Column(String(50), nullable=False, index=True)
    period_id = Column(PG_UUID(as_uuid=False), ForeignKey("reporting_periods.id"), nullable=True, index=True)
    is_applicable = Column(Boolean, default=True, nullable=False)
    reason = Column(String(500), nullable=False)
    rule_id = Column(String(50), nullable=False)
    
    # Overrides / Audited Exceptions
    is_exception = Column(Boolean, default=False, nullable=False)
    exception_reason = Column(String(500), nullable=True)
    approved_by = Column(String(255), nullable=True)
