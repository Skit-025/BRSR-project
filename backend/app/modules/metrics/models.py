import enum
from sqlalchemy import Column, String, Integer, Boolean, Text, ForeignKey, JSON
from app.db.base import Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin


class EntryLevel(str, enum.Enum):
    """Defines at which org hierarchy level this metric's raw data is entered."""
    PROJECT    = "project"       # Site engineer enters (raw fuel, electricity, waste)
    BU         = "business_unit" # BU finance/HR enters (business travel, commuting)
    SUBSIDIARY = "subsidiary"    # Subsidiary admin enters (Section A/B, purchased goods)
    GROUP      = "group"         # No manual entry — pure aggregation from children

class AggregationType(str, enum.Enum):
    SUM = "sum"
    COUNT = "count"
    AVERAGE = "average"
    WEIGHTED_AVERAGE = "weighted_average"
    WEIGHTED_PCT = "weighted_pct"
    RATIO = "ratio"
    DERIVED = "derived"
    MIN = "min"
    MAX = "max"
    LATEST = "latest"
    NON_AGGREGABLE = "non_aggregable"
    NOT_AGGREGATABLE = "not_aggregatable"

class CalculationRole(str, enum.Enum):
    RAW_INPUT = "raw_input"
    DERIVED = "derived"
    CALCULATED = "calculated"
    AGGREGATED = "aggregated"
    REPORTED = "reported"

class IndicatorType(str, enum.Enum):
    ESSENTIAL = "essential"
    LEADERSHIP = "leadership"

class EvidenceRule(str, enum.Enum):
    MANDATORY = "mandatory"
    CONDITIONAL = "conditional"
    OPTIONAL = "optional"
    NONE = "none"

class MetricCategory(str, enum.Enum):
    ENVIRONMENT = "environment"
    SOCIAL = "social"
    GOVERNANCE = "governance"

class Metric(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    Metric Catalogue matching F05 specification.
    Defines each BRSR KPI once with regulatory mapping, calculation and roll-up rules.
    """
    __tablename__ = "metrics"

    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. "ENV-ENERGY-001"
    name = Column(String(255), nullable=False)
    definition = Column(Text, nullable=False)
    category = Column(String(50), default=MetricCategory.ENVIRONMENT.value, nullable=False, index=True)
    section = Column(String(50), default="Section C", nullable=False)
    principle = Column(Integer, nullable=False, index=True)  # 1 to 9
    indicator_type = Column(String(50), default=IndicatorType.ESSENTIAL.value, nullable=False)
    brsr_core = Column(Boolean, default=False, nullable=False, index=True)  # SEBI BRSR Core subset
    core_attribute = Column(String(255), nullable=True)

    data_type = Column(String(50), default="numeric", nullable=False)  # numeric, integer, percentage, text
    base_unit = Column(String(50), nullable=False)                    # e.g. "MWh", "GJ", "tCO2e", "count"
    allowed_units = Column(JSON, nullable=False, default=list)       # e.g. ["kWh", "MWh", "GJ"]
    
    # Roll-up and boundary method (F22)
    aggregation_type = Column(String(50), default=AggregationType.SUM.value, nullable=False)
    numerator_metric_id = Column(String(36), nullable=True)
    denominator_metric_id = Column(String(36), nullable=True)
    
    # Evidence & governance rules
    evidence_rule = Column(String(50), default=EvidenceRule.MANDATORY.value, nullable=False)
    frequency = Column(String(50), default="monthly", nullable=False)
    owner_role = Column(String(50), default="maker", nullable=False)

    # Entry level routing — which org level is responsible for entering this metric's raw data
    entry_level = Column(String(50), default=EntryLevel.PROJECT.value, nullable=False, index=True)

    # UI Guidance Cards — shown to data entry users so they know what to enter and why
    guidance_text = Column(Text, nullable=True)   # Plain-language description of what to enter
    why_needed = Column(Text, nullable=True)       # Regulatory / audit reason this is required
    document_hint = Column(Text, nullable=True)    # "Upload your IOCL fuel delivery challan or DG logbook"

    calc_formula_code = Column(String(100), nullable=True)
