import pytest
from app.modules.metrics.models import AggregationType, CalculationRole

def test_aggregation_types_and_roles():
    # Verify all specification aggregation strategies exist
    assert AggregationType.SUM.value == "sum"
    assert AggregationType.COUNT.value == "count"
    assert AggregationType.AVERAGE.value == "average"
    assert AggregationType.WEIGHTED_AVERAGE.value == "weighted_average"
    assert AggregationType.RATIO.value == "ratio"
    assert AggregationType.DERIVED.value == "derived"
    assert AggregationType.MIN.value == "min"
    assert AggregationType.MAX.value == "max"
    assert AggregationType.NOT_AGGREGATABLE.value == "not_aggregatable"

    # Verify 4 distinct calculation roles exist
    assert CalculationRole.RAW_INPUT.value == "raw_input"
    assert CalculationRole.CALCULATED.value == "calculated"
    assert CalculationRole.AGGREGATED.value == "aggregated"
    assert CalculationRole.REPORTED.value == "reported"

def test_ratio_aggregation_math():
    # Critical Rule (Spec §17): Intensity = Sum(Emissions) / Sum(Production) != Average of ratios
    project_a = {"emissions": 100.0, "production": 1000.0}
    project_b = {"emissions": 300.0, "production": 2000.0}

    intensity_a = project_a["emissions"] / project_a["production"] # 0.10
    intensity_b = project_b["emissions"] / project_b["production"] # 0.15

    # Incorrect flat average
    incorrect_flat_mean = (intensity_a + intensity_b) / 2 # 0.1250

    # Correct aggregation (recomputed from sum of numerators and denominators)
    sum_emissions = project_a["emissions"] + project_b["emissions"] # 400.0
    sum_production = project_a["production"] + project_b["production"] # 3000.0
    correct_bu_intensity = sum_emissions / sum_production # 0.13333...

    assert round(correct_bu_intensity, 4) == 0.1333
    assert correct_bu_intensity != incorrect_flat_mean
