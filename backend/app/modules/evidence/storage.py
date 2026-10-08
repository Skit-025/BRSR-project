import os
import uuid
import logging
from typing import Optional
from app.config.settings import settings

logger = logging.getLogger(__name__)

# Fallback local vault directory
LOCAL_VAULT_DIR = os.path.join(os.getcwd(), "storage", "evidence_vault")
os.makedirs(LOCAL_VAULT_DIR, exist_ok=True)

class StorageService:
    """
    Object storage service supporting MinIO / S3 with seamless local disk vault fallback.
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
            # 1-second connect timeout to avoid blocking server boot when MinIO is not running
            http_client = urllib3.PoolManager(timeout=urllib3.Timeout(connect=1.0, read=2.0))
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
        except Exception as e:
            logger.info(f"MinIO not available ({e}). Using local persistent vault at {LOCAL_VAULT_DIR}")
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
                return storage_key
            except Exception as e:
                logger.warning(f"MinIO put_object failed ({e}). Falling back to local vault.")

        # Local vault storage
        local_path = os.path.join(LOCAL_VAULT_DIR, f"{unique_id}{ext}")
        with open(local_path, "wb") as f:
            f.write(data)
        return storage_key

    def get_file_bytes(self, storage_key: str) -> Optional[bytes]:
        """Retrieves raw file bytes given storage_key."""
        self._ensure_client()
        if self.minio_client:
            try:
                response = self.minio_client.get_object(settings.S3_BUCKET_NAME, storage_key)
                return response.read()
            except Exception as e:
                logger.warning(f"MinIO get_object failed: {e}")

        # Local vault check
        basename = os.path.basename(storage_key)
        local_path = os.path.join(LOCAL_VAULT_DIR, basename)
        if os.path.exists(local_path):
            with open(local_path, "rb") as f:
                return f.read()
        return None

    def delete_file(self, storage_key: str) -> bool:
        """Deletes raw file from vault given storage_key."""
        self._ensure_client()
        if self.minio_client:
            try:
                self.minio_client.remove_object(settings.S3_BUCKET_NAME, storage_key)
                return True
            except Exception as e:
                logger.warning(f"MinIO remove_object failed: {e}")

        # Local vault deletion
        basename = os.path.basename(storage_key)
        local_path = os.path.join(LOCAL_VAULT_DIR, basename)
        if os.path.exists(local_path):
            try:
                os.remove(local_path)
                return True
            except Exception as e:
                logger.warning(f"Local file removal failed: {e}")
        return False

storage_service = StorageService()
