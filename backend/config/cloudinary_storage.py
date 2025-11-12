"""
Custom Cloudinary storage classes for handling different media types.
This ensures videos use /video/ URLs and images use /image/ URLs.
"""
from cloudinary_storage.storage import MediaCloudinaryStorage
from django.core.files.storage import FileSystemStorage
from django.conf import settings


class VideoCloudinaryStorage(MediaCloudinaryStorage):
    """Custom storage for video files that forces resource_type='video'"""

    def _upload_options(self, name):
        """Override upload options to set resource_type to video"""
        options = super()._upload_options(name)
        options['resource_type'] = 'video'
        return options


class RawCloudinaryStorage(MediaCloudinaryStorage):
    """Custom storage for audio/raw files like ringtones"""

    def _upload_options(self, name):
        """Override upload options to set resource_type to raw"""
        options = super()._upload_options(name)
        options['resource_type'] = 'raw'
        return options


# Callable storage functions that return the appropriate storage instance
def get_video_storage():
    """Returns VideoCloudinaryStorage if configured, otherwise FileSystemStorage"""
    cloudinary_config = getattr(settings, 'CLOUDINARY_STORAGE', {})
    if cloudinary_config.get('CLOUD_NAME') and cloudinary_config.get('API_KEY'):
        return VideoCloudinaryStorage()
    return FileSystemStorage()


def get_raw_storage():
    """Returns RawCloudinaryStorage if configured, otherwise FileSystemStorage"""
    cloudinary_config = getattr(settings, 'CLOUDINARY_STORAGE', {})
    if cloudinary_config.get('CLOUD_NAME') and cloudinary_config.get('API_KEY'):
        return RawCloudinaryStorage()
    return FileSystemStorage()
