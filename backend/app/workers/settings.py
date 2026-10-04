"""
app/workers/settings.py
Celery worker configuration for MEIL ESG-BRSR background tasks.
"""
from app.config.settings import settings

# Broker: Redis
broker_url = settings.REDIS_URL

# Result backend: Redis
result_backend = settings.REDIS_URL

# Serialization
task_serializer = "json"
result_serializer = "json"
accept_content = ["json"]

# Timezone
timezone = "UTC"
enable_utc = True

# Task timeouts
task_soft_time_limit = 600   # 10 minutes soft limit
task_time_limit = 900        # 15 minutes hard limit

# Concurrency
worker_concurrency = 4
worker_prefetch_multiplier = 1

# Retry settings
task_acks_late = True
task_reject_on_worker_lost = True

# Result expiry
result_expires = 86400  # 24 hours

# Task routing
task_routes = {
    "app.workers.tasks_pipelines.*": {"queue": "pipelines"},
    "app.workers.tasks_reports.*":   {"queue": "reports"},
    "app.workers.tasks_ai.*":        {"queue": "ai"},
}

# Queue definitions
task_default_queue = "default"
task_queues_config = {
    "default":   {"exchange": "default",   "routing_key": "default"},
    "pipelines": {"exchange": "pipelines", "routing_key": "pipelines"},
    "reports":   {"exchange": "reports",   "routing_key": "reports"},
    "ai":        {"exchange": "ai",        "routing_key": "ai"},
}

# Beat schedule (periodic tasks)
beat_schedule = {
    "incremental-aggregation-every-hour": {
        "task": "app.workers.tasks_pipelines.trigger_incremental_aggregation_all",
        "schedule": 3600,  # every hour
        "options": {"queue": "pipelines"},
    },
}
