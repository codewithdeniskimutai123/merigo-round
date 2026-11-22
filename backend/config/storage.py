import os
from pathlib import PurePosixPath

import cloudinary
import cloudinary.uploader
from django.core.exceptions import ImproperlyConfigured
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible


@deconstructible
class CloudinaryMediaStorage(Storage):
    """Store uploaded media files in Cloudinary."""

    def __init__(self):
        cloud_name = (os.getenv("CLOUDINARY_CLOUD_NAME") or "").strip()
        api_key = (os.getenv("CLOUDINARY_API_KEY") or "").strip()
        api_secret = (os.getenv("CLOUDINARY_API_SECRET") or "").strip()


        if not all([cloud_name, api_key, api_secret]):
            raise ImproperlyConfigured(
                "Missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET."
            )

        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True,
        )

    def _save(self, name, content):
        public_id = PurePosixPath(name).with_suffix("").as_posix()

        # Extract the underlying file stream so Cloudinary SDK accepts it cleanly
        file_obj = getattr(content, "file", content)
        if hasattr(file_obj, "seek"):
            file_obj.seek(0)

        result = cloudinary.uploader.upload(
            file_obj,
            public_id=public_id,
            resource_type="image",
            unique_filename=True,
            overwrite=False,
        )

        return result["public_id"]

    def _open(self, name, mode="rb"):
        raise NotImplementedError(
            "Cloudinary files are accessed through their URLs."
        )

    def exists(self, name):
        return False

    def url(self, name):
        if not name:
            return ""
        return cloudinary.CloudinaryImage(name).build_url(
            secure=True,
        )

    def delete(self, name):
        if name:
            cloudinary.uploader.destroy(
                name,
                resource_type="image",
            )
