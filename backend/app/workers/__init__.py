"""
app/workers/__init__.py
Celery application factory for MEIL ESG-BRSR background workers.
"""
from celery import Celery

celery_app = Celery("brsr_workers")
celery_app.config_from_object("app.workers.settings")
celery_app.autodiscover_tasks(
    [
        "app.workers.tasks_pipelines",
        "app.workers.tasks_reports",
        "app.workers.tasks_ai",
    ]
)

__all__ = ["celery_app"]
