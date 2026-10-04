"""
app/pipelines/aggregation/stages/__init__.py
Dynamic loader for 9-stage aggregation pipeline.
"""
import importlib

_mod1 = importlib.import_module("app.pipelines.aggregation.stages.01_collect_approved")
_mod2 = importlib.import_module("app.pipelines.aggregation.stages.02_normalize_units")
_mod3 = importlib.import_module("app.pipelines.aggregation.stages.03_calculate")
_mod4 = importlib.import_module("app.pipelines.aggregation.stages.04_apply_boundary")
_mod5 = importlib.import_module("app.pipelines.aggregation.stages.05_rollup")
_mod6 = importlib.import_module("app.pipelines.aggregation.stages.06_eliminate")
_mod7 = importlib.import_module("app.pipelines.aggregation.stages.07_reconcile")
_mod8 = importlib.import_module("app.pipelines.aggregation.stages.08_persist_lineage")
_mod9 = importlib.import_module("app.pipelines.aggregation.stages.09_refresh_views")

stage_01_collect_approved = _mod1.stage_01_collect_approved
stage_02_normalize_units = _mod2.stage_02_normalize_units
stage_03_calculate = _mod3.stage_03_calculate
stage_04_apply_boundary = _mod4.stage_04_apply_boundary
stage_05_rollup = _mod5.stage_05_rollup
stage_06_eliminate = _mod6.stage_06_eliminate
stage_07_reconcile = _mod7.stage_07_reconcile
stage_08_persist_lineage = _mod8.stage_08_persist_lineage
stage_09_refresh_views = _mod9.stage_09_refresh_views

__all__ = [
    "stage_01_collect_approved",
    "stage_02_normalize_units",
    "stage_03_calculate",
    "stage_04_apply_boundary",
    "stage_05_rollup",
    "stage_06_eliminate",
    "stage_07_reconcile",
    "stage_08_persist_lineage",
    "stage_09_refresh_views",
]
