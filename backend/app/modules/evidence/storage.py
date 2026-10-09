import os
import uuid
import logging
from typing import Optional
from app.config.settings import settings

logger = logging.getLogger(__name__)

# Fallback local vault directory
# Multi-location vault directories to support running from repository root or backend dir
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
LOCAL_VAULT_DIRS = [
    os.path.join(BACKEND_DIR, "storage", "evidence_vault"),
    os.path.join(os.getcwd(), "backend", "storage", "evidence_vault"),
    os.path.join(os.getcwd(), "storage", "evidence_vault"),
]
for d in LOCAL_VAULT_DIRS:
    try:
        os.makedirs(d, exist_ok=True)
    except Exception:
        pass
LOCAL_VAULT_DIR = LOCAL_VAULT_DIRS[0]

class StorageService:
    """
    Object storage service supporting MinIO / S3 with seamless multi-directory local disk vault fallback.
    """
    def __init__(self):
        self.s3_client = None
        self.minio_client = None
        self._checked_minio = False

    def _ensure_client(self):
        """Lazily initialize MinIO client if reachable, otherwise fall back to local disk vault."""
        if self._checked_minio:
            return
        self._checked_minio = True
        try:
            import urllib3
            from minio import Minio
            # 0.5-second connect timeout to avoid blocking server when MinIO is not running
            http_client = urllib3.PoolManager(timeout=urllib3.Timeout(connect=0.5, read=1.0))
            client = Minio(
                endpoint=settings.S3_ENDPOINT.replace("http://", "").replace("https://", ""),
                access_key=settings.S3_ACCESS_KEY,
                secret_key=settings.S3_SECRET_KEY,
                secure=False,
                http_client=http_client
            )
            if not client.bucket_exists(settings.S3_BUCKET_NAME):
                client.make_bucket(settings.S3_BUCKET_NAME)
            self.minio_client = client
            logger.info("StorageService connected to MinIO successfully.")
        except Exception:
            self.minio_client = None

    def store_file(self, data: bytes, filename: str, mime_type: str) -> str:
        """Stores file content and returns unique storage_key."""
        self._ensure_client()
        ext = os.path.splitext(filename)[1]
        unique_id = uuid.uuid4().hex
        storage_key = f"evidence/{unique_id}{ext}"

        if self.minio_client:
            import io
            try:
                self.minio_client.put_object(
                    bucket_name=settings.S3_BUCKET_NAME,
                    object_name=storage_key,
                    data=io.BytesIO(data),
                    length=len(data),
                    content_type=mime_type
                )
            except Exception as e:
                logger.warning(f"MinIO put_object failed ({e}). Falling back to local vault.")

        # Always persist to disk in all vault directories for ultra-fast and reliable offline retrieval
        fname = f"{unique_id}{ext}"
        for vdir in LOCAL_VAULT_DIRS:
            try:
                os.makedirs(vdir, exist_ok=True)
                local_path = os.path.join(vdir, fname)
                with open(local_path, "wb") as f:
                    f.write(data)
            except Exception as e:
                logger.warning(f"Failed to write file to {vdir}: {e}")

        return storage_key

    def get_file_bytes(self, storage_key: str) -> Optional[bytes]:
        """Retrieves raw file bytes given storage_key."""
        if not storage_key:
            return None

        # Check local vault directories first for instant disk retrieval
        basename = os.path.basename(storage_key)
        stem = os.path.splitext(basename)[0]

        for vdir in LOCAL_VAULT_DIRS:
            if not os.path.exists(vdir):
                continue
            # Direct match
            cand = os.path.join(vdir, basename)
            if os.path.isfile(cand):
                try:
                    with open(cand, "rb") as f:
                        return f.read()
                except Exception:
                    pass

            # Fuzzy match by stem or prefix
            if stem:
                try:
                    for fname in os.listdir(vdir):
                        if fname == basename or fname.startswith(stem) or fname.lower() == basename.lower():
                            cand2 = os.path.join(vdir, fname)
                            if os.path.isfile(cand2):
                                with open(cand2, "rb") as f:
                                    return f.read()
                except Exception:
                    pass

        # Try MinIO if local file wasn't found
        self._ensure_client()
        if self.minio_client:
            try:
                response = self.minio_client.get_object(settings.S3_BUCKET_NAME, storage_key)
                content = response.read()
                if content:
                    # Cache locally
                    for vdir in LOCAL_VAULT_DIRS:
                        try:
                            with open(os.path.join(vdir, basename), "wb") as f:
                                f.write(content)
                        except Exception:
                            pass
                    return content
            except Exception as e:
                logger.warning(f"MinIO get_object failed: {e}")

        return None

    def delete_file(self, storage_key: str) -> bool:
        """Deletes raw file from vault given storage_key."""
        self._ensure_client()
        if self.minio_client:
            try:
                self.minio_client.remove_object(settings.S3_BUCKET_NAME, storage_key)
            except Exception as e:
                logger.warning(f"MinIO remove_object failed: {e}")

        # Local vault deletion from all dirs
        basename = os.path.basename(storage_key)
        deleted = False
        for vdir in LOCAL_VAULT_DIRS:
            local_path = os.path.join(vdir, basename)
            if os.path.exists(local_path):
                try:
                    os.remove(local_path)
                    deleted = True
                except Exception as e:
                    logger.warning(f"Local file removal failed in {vdir}: {e}")
        return deleted

storage_service = StorageService()
