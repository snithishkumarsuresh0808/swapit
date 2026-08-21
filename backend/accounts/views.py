import json
from datetime import datetime

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth import authenticate
from .models import User, Profile, Post, PostImage, PostVideo
from .serializers import UserSerializer, UserDetailSerializer, ProfileSerializer, PostSerializer


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
        profiles = Profile.objects.select_related('user').all()
        serializer = ProfileSerializer(profiles, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserPostsView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        # Get all posts for the current user
        posts = Post.objects.filter(user=request.user).prefetch_related('images', 'videos')
        serializer = PostSerializer(posts, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        # Create a new post for the current user
        # Extract post data — support both JSON and form data
        raw_skills = request.data.get('skills', '[]')
        raw_wanted = request.data.get('wanted_skills', '[]')
        raw_avail = request.data.get('availability', '[]')
        raw_timeslots = request.data.get('time_slots', '[]')

        def parse_field(val):
            if isinstance(val, list):
                return val
            try:
                return json.loads(val)
            except (json.JSONDecodeError, TypeError):
                return []

        post_data = {
            'skills': parse_field(raw_skills),
            'wanted_skills': parse_field(raw_wanted),
            'availability': parse_field(raw_avail),
            'time_slots': parse_field(raw_timeslots),
        }

        serializer = PostSerializer(data=post_data)
        if serializer.is_valid():
            post = serializer.save(user=request.user)

            # Handle image uploads
            images = request.FILES.getlist('images')
            for image in images:
                PostImage.objects.create(post=post, image=image)

            videos = request.FILES.getlist('videos')
            for video in videos:
                PostVideo.objects.create(post=post, video=video)

            # Return the post with images and videos
            result_serializer = PostSerializer(post, context={'request': request})
            return Response(result_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PostDetailView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

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
        posts = Post.objects.select_related('user').prefetch_related('images', 'videos').all()
        serializer = PostSerializer(posts, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class MatchCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Count new matches for the current user since the last visit"""
        user = request.user

        my_skills = set()
        my_wanted = set()
        for post in Post.objects.filter(user=user):
            my_skills.update(s.lower().strip() for s in post.skills if s)
            my_wanted.update(s.lower().strip() for s in post.wanted_skills if s)

        last_visit_param = request.query_params.get('last_visit')
        last_visit_date = None
        if last_visit_param:
            try:
                last_visit_date = datetime.fromisoformat(last_visit_param.replace('Z', '+00:00'))
            except ValueError:
                last_visit_date = None

        count = 0
        processed = set()
        for post in Post.objects.all():
            if post.user_id == user.id or post.user_id in processed:
                continue
            if last_visit_date and post.created_at <= last_visit_date:
                continue

            they_can_teach = any(s and s.lower().strip() in my_wanted for s in post.skills)
            can_teach_them = any(s and s.lower().strip() in my_skills for s in post.wanted_skills)

            if they_can_teach or can_teach_them:
                count += 1
                processed.add(post.user_id)

        return Response({'count': count})


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
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        profile_image = request.FILES.get('profile_image')

        if not profile_image:
            return Response(
                {'error': 'Please provide an image'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update user's profile image
        request.user.profile_image = profile_image
        request.user.save()

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
