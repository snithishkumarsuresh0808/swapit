from rest_framework import serializers
from .models import User, Profile, Post, PostImage, PostVideo


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
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone_number', 'profile_image']


class ProfileSerializer(serializers.ModelSerializer):
    user = UserDetailSerializer(read_only=True)

    class Meta:
        model = Profile
        fields = ['id', 'user', 'skills', 'wanted_skills', 'availability', 'time_slots', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class PostImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostImage
        fields = ['id', 'image', 'uploaded_at']
        read_only_fields = ['uploaded_at']


class PostVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostVideo
        fields = ['id', 'video', 'uploaded_at']
        read_only_fields = ['uploaded_at']


class PostSerializer(serializers.ModelSerializer):
    user = UserDetailSerializer(read_only=True)
    images = PostImageSerializer(many=True, read_only=True)
    videos = PostVideoSerializer(many=True, read_only=True)

    class Meta:
        model = Post
        fields = ['id', 'user', 'skills', 'wanted_skills', 'availability', 'time_slots', 'images', 'videos', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
