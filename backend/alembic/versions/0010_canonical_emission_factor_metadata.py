"""
0010_canonical_emission_factor_metadata.py

Revision: 0010
Revises: 0009
Create Date: 2026-11-09
Description:
    1. Adds canonical factor schema columns to emission_factors:
       - activity_unit, emission_unit, source_authority, source_document,
         methodology, geographic_scope, gwp_basis, approval_status.
    2. Populates precise statutory metadata and resolves dimensional distinctions
       between active tCO2e/unit and legacy kgCO2e/unit factor records.
"""
from alembic import op
import sqlalchemy as sa

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    insp = sa.inspect(conn)
    ef_cols = [c["name"] for c in insp.get_columns("emission_factors")]

    if "activity_unit" not in ef_cols:
        op.add_column("emission_factors", sa.Column("activity_unit", sa.String(50), nullable=True))
    if "emission_unit" not in ef_cols:
        op.add_column("emission_factors", sa.Column("emission_unit", sa.String(50), nullable=True, server_default="tCO2e"))
    if "source_authority" not in ef_cols:
        op.add_column("emission_factors", sa.Column("source_authority", sa.String(100), nullable=True))
    if "source_document" not in ef_cols:
        op.add_column("emission_factors", sa.Column("source_document", sa.String(255), nullable=True))
    if "methodology" not in ef_cols:
        op.add_column("emission_factors", sa.Column("methodology", sa.String(150), nullable=True))
    if "geographic_scope" not in ef_cols:
        op.add_column("emission_factors", sa.Column("geographic_scope", sa.String(100), nullable=True, server_default="IN-National"))
    if "gwp_basis" not in ef_cols:
        op.add_column("emission_factors", sa.Column("gwp_basis", sa.String(50), nullable=True, server_default="IPCC AR5 GWP100"))
    if "approval_status" not in ef_cols:
        op.add_column("emission_factors", sa.Column("approval_status", sa.String(50), nullable=True, server_default="APPROVED"))

    # Populate canonical metadata
    # Active 1.0 factors
    op.execute("""
        UPDATE emission_factors 
        SET activity_unit = unit,
            emission_unit = 'tCO2e',
            approval_status = 'APPROVED',
            gwp_basis = 'IPCC AR5 GWP100'
        WHERE version = '1.0';
    """)

    # Populate source authority and documentation
    op.execute("""
        UPDATE emission_factors
        SET source_authority = 'CEA',
            source_document = 'CO2 Baseline Database for the Indian Power Sector, User Guide Version 20.0',
            methodology = 'Combined Margin excluding RES',
            geographic_scope = 'IN-National'
        WHERE code = 'GRID-CEA';
    """)

    # State grids
    state_updates = [
        ("AP", "Andhra Pradesh", "IN-AP"),
        ("DL", "Delhi", "IN-DL"),
        ("GJ", "Gujarat", "IN-GJ"),
        ("HR", "Haryana", "IN-HR"),
        ("JH", "Jharkhand", "IN-JH"),
        ("KA", "Karnataka", "IN-KA"),
        ("KL", "Kerala", "IN-KL"),
        ("MH", "Maharashtra", "IN-MH"),
        ("MP", "Madhya Pradesh", "IN-MP"),
        ("OR", "Odisha", "IN-OR"),
        ("PB", "Punjab", "IN-PB"),
        ("RJ", "Rajasthan", "IN-RJ"),
        ("TG", "Telangana", "IN-TG"),
        ("TN", "Tamil Nadu", "IN-TN"),
        ("UP", "Uttar Pradesh", "IN-UP"),
        ("WB", "West Bengal", "IN-WB"),
    ]
    for st, name, geo in state_updates:
        op.execute(f"""
            UPDATE emission_factors
            SET source_authority = 'CEA',
                source_document = 'CO2 Baseline Database for the Indian Power Sector, Version 20.0 (State Table)',
                methodology = 'State Grid Specific Specific Emission Factor',
                geographic_scope = '{geo}'
            WHERE code = 'GRID-CEA-{st}';
        """)

    # Fuels
    op.execute("""
        UPDATE emission_factors
        SET source_authority = 'MoPNG / BEE',
            source_document = 'BEE PAT Scheme Net Calorific Values & MoPNG PPAC 2023',
            methodology = 'IPCC 2006 Tier 1 / Stoichiometric NCV',
            geographic_scope = 'IN-National'
        WHERE code IN ('DIESEL-HSD', 'DIESEL-LDO', 'PETROL');
    """)

    op.execute("""
        UPDATE emission_factors
        SET source_authority = 'MoPNG / GAIL',
            source_document = 'MoPNG Standard Gas Composition 2023 / PPAC',
            methodology = 'Stoichiometric Carbon Balance',
            geographic_scope = 'IN-National'
        WHERE code IN ('GAS-CNG', 'GAS-PNG', 'GAS-LPG');
    """)

    op.execute("""
        UPDATE emission_factors
        SET source_authority = 'Ministry of Coal / CEA',
            source_document = 'CEA Coal Quality & Emission Baseline 2023',
            methodology = 'IPCC 2006 Stationary Combustion',
            geographic_scope = 'IN-National'
        WHERE code IN ('COAL-ANT', 'COAL-BIT', 'COAL-LIG');
    """)

    op.execute("""
        UPDATE emission_factors
        SET source_authority = 'ICAO / DGCA',
            source_document = 'ICAO Carbon Emissions Calculator Methodology v12 / DGCA India Domestic Flight Averages',
            methodology = 'Direct Combustion CO2e (Excluding Radiative Forcing Uplift)',
            geographic_scope = 'IN-National'
        WHERE code = 'TRAVEL-FLIGHT';
    """)

    # Legacy factors: explicit dimensional recording
    op.execute("""
        UPDATE emission_factors
        SET emission_unit = 'kgCO2e',
            activity_unit = unit,
            approval_status = 'SUPERSEDED'
        WHERE version = '0.9-legacy' AND code IN ('DIESEL-HSD', 'DIESEL-LDO', 'PETROL', 'GAS-CNG', 'GAS-PNG', 'GAS-LPG', 'COAL-ANT', 'COAL-BIT', 'COAL-LIG');
    """)
    op.execute("""
        UPDATE emission_factors
        SET emission_unit = 'tCO2e',
            activity_unit = 'MWh',
            approval_status = 'SUPERSEDED'
        WHERE version = '0.9-legacy' AND code = 'GRID-CEA';
    """)
    op.execute("""
        UPDATE emission_factors
        SET emission_unit = 'kgCO2e',
            activity_unit = 'passenger-km',
            approval_status = 'SUPERSEDED'
        WHERE version = '0.9-legacy' AND code = 'TRAVEL-FLIGHT';
    """)


def downgrade():
    cols = [
        "approval_status",
        "gwp_basis",
        "geographic_scope",
        "methodology",
        "source_document",
        "source_authority",
        "emission_unit",
        "activity_unit",
    ]
    for col in cols:
        op.drop_column("emission_factors", col)

