"""
app/modules/calc/models.py
Calculation execution logs, versioned calculation formulas, and custom emission factors.
Uses NUMERIC for all emission factors and mathematical calculations.
"""
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, Date, Boolean, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from datetime import datetime, timezone
import uuid
from app.db.base import Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin


class CalcFormula(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    Versioned calculation formula registry (e.g. Scope 1 mobile/stationary, Scope 2 location/market, LTIFR).
    Ensures that historical calculations use the exact formula active during that reporting period.
    """
    __tablename__ = "calc_formulas"

    code = Column(String(50), index=True, nullable=False)           # e.g. "GHG_SCOPE1_STATIONARY"
    version = Column(String(20), nullable=False, default="1.0.0")  # Semver
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    expression = Column(Text, nullable=False)                       # AST or python expression e.g. "fuel_qty * emission_factor * gwp"
    unit = Column(String(50), nullable=False)                       # "tCO2e"
    
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)                      # Null means currently active
    is_active = Column(Boolean, default=True, nullable=False)
    test_cases = Column(JSONB, nullable=True)                       # Known input/output test fixtures for verification


class CalculationLog(Base, TimestampMixin):
    """
    Audit log of every deterministic calculation run.
    Guarantees reproducibility of calculated indicators (Scope 1, 2, LTIFR, Intensities).
    """
    __tablename__ = "calc_logs"

    id = Column(
        PG_UUID(as_uuid=False),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    formula_code = Column(String(100), nullable=False, index=True)
    org_node_id = Column(PG_UUID(as_uuid=False), ForeignKey("org_nodes.id"), nullable=False, index=True)
    period_id = Column(PG_UUID(as_uuid=False), ForeignKey("reporting_periods.id"), nullable=False, index=True)
    
    input_parameters = Column(JSONB, nullable=False)
    output_result = Column(JSONB, nullable=False)
    factors_applied = Column(JSONB, nullable=True)
    
    status = Column(String(50), default="SUCCESS", nullable=False)
    error_message = Column(String(500), nullable=True)
    executed_by = Column(PG_UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)


class CustomEmissionFactor(Base, TimestampMixin, SoftDeleteMixin):
    """
    Facility-specific or supplier-specific emission factors (e.g. customized green tariff, captive cogen).
    Uses high-precision NUMERIC(20, 8) to prevent rounding discrepancies in carbon accounting.
    """
    __tablename__ = "custom_emission_factors"

    id = Column(
        PG_UUID(as_uuid=False),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    org_node_id = Column(PG_UUID(as_uuid=False), ForeignKey("org_nodes.id"), nullable=True, index=True)
    factor_name = Column(String(150), nullable=False)
    category = Column(String(50), nullable=False)       # "fuel", "electricity", "transport"
    fuel_or_source = Column(String(100), nullable=False)
    value = Column(Numeric(precision=20, scale=8), nullable=False)
    unit = Column(String(50), nullable=False)           # "tCO2e/MWh", "tCO2e/kL"
    source_reference = Column(String(255), nullable=True)
    is_verified = Column(Numeric(1, 0), default=0)


class EmissionFactor(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    Standard Government-approved Emission Factors (CEA, BEE, MoPNG, MoEFCC).
    Supports versioning, Indian context citation, and granular fuel sub-types.
    Matches Director's required catalog:
    COAL-ANT, COAL-BIT, COAL-LIG, DIESEL-HSD, DIESEL-LDO,
    GAS-CNG, GAS-PNG, GAS-LPG, PETROL, GRID-CEA, TRAVEL-FLIGHT.
    """
    __tablename__ = "emission_factors"

    code = Column(String(50), unique=True, index=True, nullable=False)     # e.g. "DIESEL-HSD"
    category = Column(String(50), nullable=False, index=True)             # "Coal", "Diesel", "Gas", "Electricity", "Travel"
    subtype = Column(String(100), nullable=False)                          # "High Speed Diesel", "Anthracite"
    unit = Column(String(50), nullable=False)                              # "L", "kg", "kWh", "passenger-km"
    co2e_factor = Column(Numeric(precision=20, scale=8), nullable=False)  # value per unit
    source = Column(String(255), nullable=False)                           # "BEE / MoPNG 2023"
    effective_year = Column(String(20), default="2023-24", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
