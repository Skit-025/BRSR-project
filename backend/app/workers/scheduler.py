"""
app/workers/scheduler.py
Celery Beat scheduler configuration for MEIL ESG-BRSR periodic tasks.
Defines the full schedule of background jobs for the platform.
"""
from __future__ import annotations

from celery.schedules import crontab

from app.workers import celery_app

# ------------------------------------------------------------------
# Beat Schedule Registration
# ------------------------------------------------------------------

celery_app.conf.beat_schedule.update(
    {
        # ── Pipeline Tasks ─────────────────────────────────────────────
        "incremental-aggregation-every-hour": {
            "task": "app.workers.tasks_pipelines.trigger_incremental_aggregation_all",
            "schedule": crontab(minute=0),  # top of every hour
            "options": {"queue": "pipelines"},
        },
        # ── Report Tasks ───────────────────────────────────────────────
        "scheduled-reports-daily-midnight": {
            "task": "app.workers.tasks_reports.scheduled_report_all_entities",
            "schedule": crontab(hour=0, minute=30),  # 00:30 UTC daily
            "options": {"queue": "reports"},
        },
        # ── AI Tasks ───────────────────────────────────────────────────
        # (AI tasks are event-driven; no recurring schedule needed by default)
    }
)

celery_app.conf.timezone = "UTC"
celery_app.conf.enable_utc = True
