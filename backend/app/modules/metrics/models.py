import enum
from sqlalchemy import Column, String, Integer, Boolean, Text, ForeignKey, JSON
from app.db.base import Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin

class AggregationType(str, enum.Enum):
    SUM = "sum"
    RATIO = "ratio"
    WEIGHTED_PCT = "weighted_pct"
    LATEST = "latest"
    NON_AGGREGABLE = "non_aggregable"

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

    calc_formula_code = Column(String(100), nullable=True)
