from rest_framework import serializers
from .models import User, Profile, Post, PostImage, PostVideo, Ringtone


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone_number', 'password']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone_number=validated_data.get('phone_number', ''),
            password=validated_data['password']
        )
        return user


class UserDetailSerializer(serializers.ModelSerializer):
    profile_image = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone_number', 'profile_image']

    def get_profile_image(self, obj):
        if obj.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_image.url)
        return None


class ProfileSerializer(serializers.ModelSerializer):
    user = UserDetailSerializer(read_only=True)

    class Meta:
        model = Profile
        fields = ['id', 'user', 'skills', 'wanted_skills', 'availability', 'time_slots', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class PostImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = PostImage
        fields = ['id', 'image', 'uploaded_at']
        read_only_fields = ['uploaded_at']

    def get_image(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
        return None


class PostVideoSerializer(serializers.ModelSerializer):
    video = serializers.SerializerMethodField()

    class Meta:
        model = PostVideo
        fields = ['id', 'video', 'uploaded_at']
        read_only_fields = ['uploaded_at']

    def get_video(self, obj):
        if obj.video:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.video.url)
        return None


class PostSerializer(serializers.ModelSerializer):
    user = UserDetailSerializer(read_only=True)
    images = PostImageSerializer(many=True, read_only=True)
    videos = PostVideoSerializer(many=True, read_only=True)

    class Meta:
        model = Post
        fields = ['id', 'user', 'skills', 'wanted_skills', 'availability', 'time_slots', 'images', 'videos', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class RingtoneSerializer(serializers.ModelSerializer):
    audio_url = serializers.SerializerMethodField()

    class Meta:
        model = Ringtone
        fields = ['id', 'name', 'audio_file', 'audio_url', 'is_active', 'uploaded_at']
        read_only_fields = ['uploaded_at']

    def get_audio_url(self, obj):
        if obj.audio_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.audio_file.url)
        return None
