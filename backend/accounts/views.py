from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth import authenticate
from .models import User, Profile, Post, PostImage, PostVideo, Ringtone
from .serializers import UserSerializer, UserDetailSerializer, ProfileSerializer, PostSerializer, RingtoneSerializer


class SignUpView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Create token for the user
        token, created = Token.objects.get_or_create(user=user)

        return Response(
            {
                'message': 'User created successfully',
                'user': UserDetailSerializer(user).data,
                'token': token.key
            },
            status=status.HTTP_201_CREATED
        )


class LoginView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response(
                {'error': 'Please provide both email and password'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Authenticate user
        user = authenticate(username=email, password=password)

        if user is None:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Get or create token
        token, created = Token.objects.get_or_create(user=user)

        # Check if user has a profile
        has_profile = hasattr(user, 'profile')

        return Response(
            {
                'token': token.key,
                'user': UserDetailSerializer(user).data,
                'has_profile': has_profile
            },
            status=status.HTTP_200_OK
        )


class AllProfilesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profiles = Profile.objects.all()
        serializer = ProfileSerializer(profiles, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserPostsView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        # Get all posts for the current user
        posts = Post.objects.filter(user=request.user)
        serializer = PostSerializer(posts, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        # Create a new post for the current user
        import json

        # Extract post data
        post_data = {
            'skills': json.loads(request.data.get('skills', '[]')),
            'wanted_skills': json.loads(request.data.get('wanted_skills', '[]')),
            'availability': json.loads(request.data.get('availability', '[]')),
            'time_slots': json.loads(request.data.get('time_slots', '[]')),
        }

        serializer = PostSerializer(data=post_data)
        if serializer.is_valid():
            post = serializer.save(user=request.user)

            # Handle image uploads
            images = request.FILES.getlist('images')
            print(f"📸 Received {len(images)} images for upload")
            for image in images:
                created_image = PostImage.objects.create(post=post, image=image)
                print(f"✅ Saved image: {created_image.image.url}")

            # Handle video uploads
            videos = request.FILES.getlist('videos')
            print(f"🎥 Received {len(videos)} videos for upload")
            for video in videos:
                created_video = PostVideo.objects.create(post=post, video=video)
                print(f"✅ Saved video: {created_video.video.url}")

            # Return the post with images and videos
            result_serializer = PostSerializer(post, context={'request': request})
            return Response(result_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PostDetailView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request, pk):
        try:
            post = Post.objects.get(pk=pk, user=request.user)
            serializer = PostSerializer(post, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Post.DoesNotExist:
            return Response(
                {'error': 'Post not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    def put(self, request, pk):
        import json

        try:
            post = Post.objects.get(pk=pk, user=request.user)
        except Post.DoesNotExist:
            return Response(
                {'error': 'Post not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Extract post data
        post_data = {}
        if 'skills' in request.data:
            post_data['skills'] = json.loads(request.data.get('skills', '[]'))
        if 'wanted_skills' in request.data:
            post_data['wanted_skills'] = json.loads(request.data.get('wanted_skills', '[]'))
        if 'availability' in request.data:
            post_data['availability'] = json.loads(request.data.get('availability', '[]'))
        if 'time_slots' in request.data:
            post_data['time_slots'] = json.loads(request.data.get('time_slots', '[]'))

        serializer = PostSerializer(post, data=post_data, partial=True)
        if serializer.is_valid():
            post = serializer.save()

            # Handle new image uploads
            new_images = request.FILES.getlist('images')
            for image in new_images:
                PostImage.objects.create(post=post, image=image)

            # Handle new video uploads
            new_videos = request.FILES.getlist('videos')
            for video in new_videos:
                PostVideo.objects.create(post=post, video=video)

            # Return the updated post
            result_serializer = PostSerializer(post, context={'request': request})
            return Response(result_serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            post = Post.objects.get(pk=pk, user=request.user)
            post.delete()
            return Response(
                {'message': 'Post deleted successfully'},
                status=status.HTTP_204_NO_CONTENT
            )
        except Post.DoesNotExist:
            return Response(
                {'error': 'Post not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class AllPostsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Get all posts from all users
        posts = Post.objects.all()
        serializer = PostSerializer(posts, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            profile = request.user.profile
            serializer = ProfileSerializer(profile)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Profile.DoesNotExist:
            return Response(
                {'error': 'Profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    def post(self, request):
        # Check if profile already exists
        if hasattr(request.user, 'profile'):
            return Response(
                {'error': 'Profile already exists. Use PUT to update.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ProfileSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        try:
            profile = request.user.profile
        except Profile.DoesNotExist:
            return Response(
                {'error': 'Profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response(
                {'error': 'Please provide both old and new password'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if old password is correct
        if not request.user.check_password(old_password):
            return Response(
                {'error': 'Current password is incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Set new password
        request.user.set_password(new_password)
        request.user.save()

        return Response(
            {'message': 'Password updated successfully'},
            status=status.HTTP_200_OK
        )


class UpdateProfileImageView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        profile_image = request.FILES.get('profile_image')

        if not profile_image:
            return Response(
                {'error': 'Please provide an image'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update user's profile image
        print(f"👤 Uploading profile image for user {request.user.id}: {profile_image.name}")
        request.user.profile_image = profile_image
        request.user.save()
        print(f"✅ Profile image saved: {request.user.profile_image.url}")

        return Response(
            {
                'message': 'Profile image updated successfully',
                'user': UserDetailSerializer(request.user, context={'request': request}).data
            },
            status=status.HTTP_200_OK
        )


class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user

        # Delete the user's token
        try:
            token = Token.objects.get(user=user)
            token.delete()
        except Token.DoesNotExist:
            pass

        # Delete the user account (this will cascade delete related data)
        user.delete()

        return Response(
            {'message': 'Account deleted successfully'},
            status=status.HTTP_200_OK
        )
