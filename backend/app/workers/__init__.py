"""
app/workers/__init__.py
Celery application factory for MEIL ESG-BRSR background workers.
Includes fallback shim if Celery is not installed in the local execution environment.
"""
try:
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
except ImportError:
    class DummyTask:
        def __init__(self, fn):
            self.fn = fn
        def apply_async(self, args=None, kwargs=None, **opts):
            return self.apply(args=args, kwargs=kwargs)
        def apply(self, args=None, kwargs=None, **opts):
            class AsyncRes:
                def __init__(self, res):
                    self.result = res
                    self.id = "local-task-id"
            args = args or ()
            kwargs = kwargs or {}
            # Check if bound task expecting self
            import inspect
            sig = inspect.signature(self.fn)
            if "self" in sig.parameters and (not args or args[0] != self):
                res = self.fn(self, *args, **kwargs)
            else:
                res = self.fn(*args, **kwargs)
            return AsyncRes(res)
        def retry(self, exc=None):
            if exc:
                raise exc
            raise RuntimeError("Task retry")
        def __call__(self, *args, **kwargs):
            return self.fn(*args, **kwargs)

    class DummyCelery:
        def task(self, *args, **kwargs):
            def decorator(fn):
                return DummyTask(fn)
            return decorator
    celery_app = DummyCelery()

__all__ = ["celery_app"]
