"""
Custom Cloudinary storage classes for handling different media types.
This ensures videos use /video/ URLs and images use /image/ URLs.
"""
from cloudinary_storage.storage import MediaCloudinaryStorage


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
