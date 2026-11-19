
import os
from pathlib import PurePosixPath

import cloudinary
import cloudinary.uploader

from django.core.files.storage import Storage


class CloudinaryMediaStorage(Storage):
    """Store uploaded media files in Cloudinary."""

    def __init__(self):
        cloudinary.config(
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key=os.getenv("CLOUDINARY_API_KEY"),
            api_secret=os.getenv("CLOUDINARY_API_SECRET"),
            secure=True,
        )

    def _save(self, name, content):
        public_id = PurePosixPath(name).with_suffix("").as_posix()

        content.seek(0)

        result = cloudinary.uploader.upload(
            content,
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
        return cloudinary.CloudinaryImage(name).build_url(
            secure=True,
        )

    def delete(self, name):
        cloudinary.uploader.destroy(
            name,
            resource_type="image",
        )
