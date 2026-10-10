from types import SimpleNamespace

from app.modules.org.applicability.engine import APPLICABILITY_RULES


def test_fuel_applicability_includes_solar_generation():
    solar_project = SimpleNamespace(
        project_type="solar_generation",
        type="project",
        is_active=True,
        boundary=True,
    )

    fuel_rule = next(
        rule for rule in APPLICABILITY_RULES
        if rule["metric_code"] == "ENV-ENERGY-002"
    )

    assert fuel_rule["condition"](solar_project)
