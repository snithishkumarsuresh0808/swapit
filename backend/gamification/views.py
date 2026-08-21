from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserXP, Badge, UserBadge, SkillProgress, BADGE_DEFINITIONS, compute_level
from .serializers import UserXPSerializer, BadgeSerializer, SkillProgressSerializer
from .signals import get_or_create_xp, check_and_award_badges


class GamificationDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        xp_obj = get_or_create_xp(request.user)
        xp_obj.update_streak()
        check_and_award_badges(request.user)
        xp_obj.refresh_from_db()
        serializer = UserXPSerializer(xp_obj, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class AllBadgesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        for key, badge_def in BADGE_DEFINITIONS.items():
            Badge.objects.get_or_create(
                key=key,
                defaults={
                    'name': badge_def['name'],
                    'icon': badge_def['icon'],
                    'description': badge_def['description'],
                    'xp_reward': badge_def['xp_reward'],
                }
            )
        badges = Badge.objects.all()
        serializer = BadgeSerializer(badges, many=True, context={'user': request.user})
        return Response(serializer.data, status=status.HTTP_200_OK)


class SkillProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        skills = SkillProgress.objects.filter(user=request.user)
        serializer = SkillProgressSerializer(skills, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        skill_name = request.data.get('skill_name', '').strip()
        progress = request.data.get('progress')

        if not skill_name:
            return Response({'error': 'skill_name is required'}, status=status.HTTP_400_BAD_REQUEST)
        if progress is None or not (0 <= int(progress) <= 100):
            return Response({'error': 'progress must be 0-100'}, status=status.HTTP_400_BAD_REQUEST)

        sp, created = SkillProgress.objects.update_or_create(
            user=request.user,
            skill_name=skill_name,
            defaults={'progress': int(progress)}
        )
        return Response(SkillProgressSerializer(sp).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class LeaderboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = min(int(request.query_params.get('limit', 20)), 50)
        top_users = UserXP.objects.select_related('user')[:limit]
        results = []
        for i, xp_obj in enumerate(top_users, 1):
            user = xp_obj.user
            results.append({
                'rank': i,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'profile_image': user.profile_image.url if user.profile_image else None,
                },
                'xp': xp_obj.xp,
                'level_info': xp_obj.level_info,
            })
        return Response(results, status=status.HTTP_200_OK)
