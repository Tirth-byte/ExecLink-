from __future__ import annotations

import abc
import mimetypes
import os
from pathlib import Path
from typing import BinaryIO

ROOT_DIR = Path(__file__).resolve().parents[2]
DEFAULT_LOCAL_STORAGE = ROOT_DIR / "data" / "storage" / "evidence"


class EvidenceStorage(abc.ABC):
    """Abstract interface for ExecLink field evidence storage."""

    @abc.abstractmethod
    def save(self, storage_key: str, data: bytes, content_type: str) -> str:
        """Persist media bytes under the given storage key and return storage reference."""
        pass

    @abc.abstractmethod
    def read(self, storage_key: str) -> tuple[bytes, str]:
        """Read media bytes and content type."""
        pass

    @abc.abstractmethod
    def get_url(self, storage_key: str, project_id: str, evidence_id: str) -> str:
        """Generate public or authenticated media access URL."""
        pass

    @abc.abstractmethod
    def delete(self, storage_key: str) -> bool:
        """Delete media from storage."""
        pass

    @abc.abstractmethod
    def exists(self, storage_key: str) -> bool:
        """Check if media exists in storage."""
        pass


class LocalEvidenceStorage(EvidenceStorage):
    """Local filesystem adapter for development, testing, and offline-capable single-node setups."""

    def __init__(self, base_dir: Path | str | None = None):
        self.base_dir = Path(base_dir or os.environ.get("EVIDENCE_STORAGE_DIR", DEFAULT_LOCAL_STORAGE))
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _file_path(self, storage_key: str) -> Path:
        # Prevent directory traversal attacks
        safe_key = os.path.basename(storage_key)
        return self.base_dir / safe_key

    def save(self, storage_key: str, data: bytes, content_type: str) -> str:
        dest = self._file_path(storage_key)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        return storage_key

    def read(self, storage_key: str) -> tuple[bytes, str]:
        path = self._file_path(storage_key)
        if not path.exists():
            raise FileNotFoundError(f"Storage key not found: {storage_key}")
        content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        return path.read_bytes(), content_type

    def get_url(self, storage_key: str, project_id: str, evidence_id: str) -> str:
        return f"/api/v1/projects/{project_id}/evidence/{evidence_id}/media"

    def delete(self, storage_key: str) -> bool:
        path = self._file_path(storage_key)
        if path.exists():
            path.unlink()
            return True
        return False

    def exists(self, storage_key: str) -> bool:
        return self._file_path(storage_key).exists()


class CloudEvidenceStorage(EvidenceStorage):
    """
    Production-ready object storage adapter (S3 / Cloudflare R2 / MinIO / Supabase / GCS).
    Requires explicit provider environment configuration:
    - EVIDENCE_S3_BUCKET
    - EVIDENCE_S3_ENDPOINT (optional, for R2 / MinIO)
    - AWS_ACCESS_KEY_ID / EVIDENCE_S3_KEY
    - AWS_SECRET_ACCESS_KEY / EVIDENCE_S3_SECRET
    - EVIDENCE_S3_REGION (optional)
    """

    def __init__(
        self,
        bucket: str | None = None,
        endpoint_url: str | None = None,
        access_key: str | None = None,
        secret_key: str | None = None,
        region: str | None = None,
    ):
        self.bucket = bucket or os.environ.get("EVIDENCE_S3_BUCKET", "")
        self.endpoint_url = endpoint_url or os.environ.get("EVIDENCE_S3_ENDPOINT", "")
        self.access_key = access_key or os.environ.get("EVIDENCE_S3_KEY") or os.environ.get("AWS_ACCESS_KEY_ID", "")
        self.secret_key = secret_key or os.environ.get("EVIDENCE_S3_SECRET") or os.environ.get("AWS_SECRET_ACCESS_KEY", "")
        self.region = region or os.environ.get("EVIDENCE_S3_REGION", "auto")

    @property
    def is_configured(self) -> bool:
        return bool(self.bucket and self.access_key and self.secret_key)

    def _get_boto_client(self):
        if not self.is_configured:
            raise RuntimeError("Cloud object storage provider is not configured. Set EVIDENCE_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.")
        import boto3
        from botocore.config import Config
        return boto3.client(
            "s3",
            endpoint_url=self.endpoint_url or None,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region,
            config=Config(signature_version="s3v4"),
        )

    def save(self, storage_key: str, data: bytes, content_type: str) -> str:
        s3 = self._get_boto_client()
        s3.put_object(
            Bucket=self.bucket,
            Key=storage_key,
            Body=data,
            ContentType=content_type,
        )
        return storage_key

    def read(self, storage_key: str) -> tuple[bytes, str]:
        s3 = self._get_boto_client()
        obj = s3.get_object(Bucket=self.bucket, Key=storage_key)
        content_type = obj.get("ContentType", "application/octet-stream")
        return obj["Body"].read(), content_type

    def get_url(self, storage_key: str, project_id: str, evidence_id: str) -> str:
        if not self.is_configured:
            return f"/api/v1/projects/{project_id}/evidence/{evidence_id}/media"
        s3 = self._get_boto_client()
        # Generate presigned URL valid for 1 hour
        return s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": storage_key},
            ExpiresIn=3600,
        )

    def delete(self, storage_key: str) -> bool:
        s3 = self._get_boto_client()
        s3.delete_object(Bucket=self.bucket, Key=storage_key)
        return True

    def exists(self, storage_key: str) -> bool:
        s3 = self._get_boto_client()
        from botocore.exceptions import ClientError
        try:
            s3.head_object(Bucket=self.bucket, Key=storage_key)
            return True
        except ClientError:
            return False


_active_storage: EvidenceStorage | None = None


def get_storage() -> EvidenceStorage:
    """Returns configured production cloud storage or default local filesystem storage."""
    global _active_storage
    if _active_storage is not None:
        return _active_storage

    cloud = CloudEvidenceStorage()
    if cloud.is_configured:
        _active_storage = cloud
    else:
        _active_storage = LocalEvidenceStorage()
    return _active_storage


def set_storage(storage: EvidenceStorage | None) -> None:
    """Set or reset active storage instance for testing."""
    global _active_storage
    _active_storage = storage
