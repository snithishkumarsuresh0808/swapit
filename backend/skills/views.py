from django.db.models import Q, Avg, Count, Subquery, OuterRef
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Profile, Post
from accounts.serializers import UserDetailSerializer
from chat.models import Connection
from .models import SkillCategory, Skill, Review, Session
from .serializers import (
    SkillCategorySerializer, SkillSerializer,
    ReviewSerializer, SessionSerializer
)


# ============================================================
# Skill Categories & Skills
# ============================================================

class SkillCategoryListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        categories = SkillCategory.objects.prefetch_related('skills').all()
        serializer = SkillCategorySerializer(categories, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class SkillListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        category_id = request.query_params.get('category')
        search = request.query_params.get('search', '').strip()

        skills = Skill.objects.select_related('category').all()

        if category_id:
            skills = skills.filter(category_id=category_id)

        if search:
            skills = skills.filter(name__icontains=search)

        serializer = SkillSerializer(skills, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


# ============================================================
# Smart Matching / Discover
# ============================================================

def calculate_match_score(user, profile, post, target_profile, target_post):
    """Calculate a weighted match score between two users."""
    my_skills = set(s.lower().strip() for s in (post.skills if post else profile.skills) if s)
    my_wanted = set(s.lower().strip() for s in (post.wanted_skills if post else profile.wanted_skills) if s)
    their_skills = set(s.lower().strip() for s in (target_post.skills if target_post else target_profile.skills) if s)
    their_wanted = set(s.lower().strip() for s in (target_post.wanted_skills if target_post else target_profile.wanted_skills) if s)

    # Skill Compatibility (40%) - can they teach me what I want?
    if my_wanted and their_skills:
        teach_me_score = len(my_wanted & their_skills) / len(my_wanted) if my_wanted else 0
    else:
        teach_me_score = 0

    # Wanted Skill Match (25%) - can I teach them what they want?
    if their_wanted and my_skills:
        teach_them_score = len(their_wanted & my_skills) / len(their_wanted) if their_wanted else 0
    else:
        teach_them_score = 0

    # Availability (15%)
    my_avail = set(a.lower().strip() for a in profile.availability if a)
    their_avail = set(a.lower().strip() for a in target_profile.availability if a)
    avail_score = len(my_avail & their_avail) / max(len(my_avail | their_avail), 1) if (my_avail and their_avail) else 0

    # Profile Completeness (10%)
    completeness = 0
    if profile.skills: completeness += 0.25
    if profile.wanted_skills: completeness += 0.25
    if profile.availability: completeness += 0.25
    if profile.time_slots: completeness += 0.25
    their_completeness = 0
    if target_profile.skills: their_completeness += 0.25
    if target_profile.wanted_skills: their_completeness += 0.25
    if target_profile.availability: their_completeness += 0.25
    if target_profile.time_slots: their_completeness += 0.25
    completeness_score = (completeness + their_completeness) / 2

    # Weighted total
    total = (
        teach_me_score * 40 +
        teach_them_score * 25 +
        avail_score * 15 +
        completeness_score * 10
    )

    # Bonus: mutual exchange (both can teach each other) +10%
    if teach_me_score > 0 and teach_them_score > 0:
        total += 10

    total = min(round(total, 1), 100)

    breakdown = {
        'skill_compatibility': round(teach_me_score * 40, 1),
        'wanted_skill_match': round(teach_them_score * 25, 1),
        'availability': round(avail_score * 15, 1),
        'profile_completeness': round(completeness_score * 10, 1),
        'mutual_bonus': 10 if (teach_me_score > 0 and teach_them_score > 0) else 0,
    }

    return total, breakdown


class DiscoverView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        skill_filter = request.query_params.get('skill', '').strip().lower()
        availability_filter = request.query_params.get('availability', '').strip().lower()
        level_filter = request.query_params.get('level', '').strip().lower()
        mode_filter = request.query_params.get('mode', '').strip().lower()
        available_now = request.query_params.get('available_now', '').lower() == 'true'
        available_weekends = request.query_params.get('available_weekends', '').lower() == 'true'

        # Get current user's profile and latest post
        try:
            my_profile = user.profile
        except Profile.DoesNotExist:
            return Response(
                {'error': 'Create your profile first to use Discover'},
                status=status.HTTP_400_BAD_REQUEST
            )
        my_post = Post.objects.filter(user=user).order_by('-created_at').first()

        my_skills = set(s.lower().strip() for s in (my_post.skills if my_post else my_profile.skills) if s)
        my_wanted = set(s.lower().strip() for s in (my_post.wanted_skills if my_post else my_profile.wanted_skills) if s)

        # Get all other users with profiles and posts in batch
        profiles = Profile.objects.select_related('user').exclude(user=user)
        target_user_ids = [p.user_id for p in profiles]
        posts_map = {p.user_id: p for p in Post.objects.filter(user_id__in=target_user_ids)}

        # Batch fetch stats to avoid N+1
        user_ids_set = set(target_user_ids)
        
        # Batch reviews
        reviews_data = Review.objects.filter(
            reviewed_user_id__in=user_ids_set
        ).values('reviewed_user_id').annotate(
            avg_skill=Avg('skill_rating'),
            avg_comm=Avg('communication_rating'),
            avg_rel=Avg('reliability_rating'),
            total=Count('id')
        )
        reviews_map = {
            r['reviewed_user_id']: {
                'avg_skill': r['avg_skill'],
                'avg_comm': r['avg_comm'],
                'avg_rel': r['avg_rel'],
                'total': r['total'],
            } for r in reviews_data
        }

        # Batch sessions
        sessions_data = Session.objects.filter(
            Q(from_user_id__in=user_ids_set) | Q(to_user_id__in=user_ids_set),
            status='completed'
        ).values('from_user_id', 'to_user_id')
        session_counts = {}
        for s in sessions_data:
            uid = s['to_user_id']  # both from and to are in target set
            session_counts[uid] = session_counts.get(uid, 0) + 1
            if s['from_user_id'] in user_ids_set:
                session_counts[s['from_user_id']] = session_counts.get(s['from_user_id'], 0) + 1

        # Batch connections
        conns = Connection.objects.filter(
            Q(from_user=user, to_user_id__in=user_ids_set) |
            Q(to_user=user, from_user_id__in=user_ids_set)
        )
        conn_map = {}
        for c in conns:
            other_id = c.to_user_id if c.from_user_id == user.id else c.from_user_id
            conn_map[other_id] = c.status

        # Precompute today for availability checks
        days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        today = days[timezone.now().weekday()]

        results = []
        for profile in profiles:
            target_post = posts_map.get(profile.user_id)

            # Compute target skills once
            target_skills = set(s.lower().strip() for s in (target_post.skills if target_post else profile.skills) if s)
            target_wanted = set(s.lower().strip() for s in (target_post.wanted_skills if target_post else profile.wanted_skills) if s)
            target_avail = set(a.lower().strip() for a in (target_post.availability if target_post else profile.availability) if a)

            # Apply filters
            if skill_filter and skill_filter not in target_skills and skill_filter not in target_wanted:
                continue
            if availability_filter and availability_filter not in target_avail:
                continue
            if available_now and today not in target_avail:
                continue
            if available_weekends and not ('saturday' in target_avail or 'sunday' in target_avail):
                continue

            # Calculate match score
            score, breakdown = calculate_match_score(
                user, my_profile, my_post, profile, target_post
            )

            if score == 0:
                continue

            # Use precomputed batch data
            rv = reviews_map.get(profile.user_id, {})
            avg_rating = rv.get('avg_skill')
            total_reviews = rv.get('total', 0)
            total_sessions = session_counts.get(profile.user_id, 0)
            conn_status = conn_map.get(profile.user_id, 'none')

            # Serialize user inline
            user_data = UserDetailSerializer(profile.user, context={'request': request}).data

            results.append({
                'user': user_data,
                'profile': {
                    'skills': profile.skills,
                    'wanted_skills': profile.wanted_skills,
                    'availability': profile.availability,
                    'time_slots': profile.time_slots,
                },
                'match_score': score,
                'match_breakdown': breakdown,
                'skills_teach': list(target_skills),
                'skills_want': list(target_wanted),
                'availability': list(target_avail),
                'time_slots': list(target_post.time_slots if target_post else profile.time_slots),
                'avg_rating': round(float(avg_rating), 1) if avg_rating else None,
                'total_reviews': total_reviews,
                'total_sessions': total_sessions,
                'connection_status': conn_status,
            })

        # Sort by match score descending
        results.sort(key=lambda x: x['match_score'], reverse=True)

        # Categorize results
        top_matches = [r for r in results if r['match_score'] >= 70]
        new_matches = results[:10]
        available_now_results = [r for r in results if today in r['availability']]

        return Response({
            'all_matches': results,
            'top_matches': top_matches,
            'new_matches': new_matches,
            'available_now': available_now_results,
            'total': len(results),
        }, status=status.HTTP_200_OK)


# ============================================================
# Reviews & Reputation
# ============================================================

class ReviewListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id=None):
        if user_id:
            reviews = Review.objects.filter(reviewed_user_id=user_id).select_related('reviewer', 'reviewed_user')
        else:
            reviews = Review.objects.filter(reviewed_user=request.user).select_related('reviewer', 'reviewed_user')

        serializer = ReviewSerializer(reviews, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = ReviewSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            reviewed_user_id = serializer.validated_data.get('reviewed_user_id')
            if reviewed_user_id == request.user.id:
                return Response(
                    {'error': 'You cannot review yourself'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if already reviewed for same session
            session_id = serializer.validated_data.get('session_id_str', '')
            if session_id:
                existing = Review.objects.filter(
                    reviewer=request.user,
                    reviewed_user_id=reviewed_user_id,
                    session_id_str=session_id
                ).exists()
                if existing:
                    return Response(
                        {'error': 'You have already reviewed this session'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            review = serializer.save(reviewer=request.user)
            return Response(ReviewSerializer(review, context={'request': request}).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserReputationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        reviews = Review.objects.filter(reviewed_user_id=user_id)

        agg = reviews.aggregate(
            avg_skill=Avg('skill_rating'),
            avg_comm=Avg('communication_rating'),
            avg_rel=Avg('reliability_rating'),
        )
        avg_skill = agg['avg_skill']
        avg_comm = agg['avg_comm']
        avg_rel = agg['avg_rel']
        total_reviews = reviews.count()

        total_sessions = Session.objects.filter(
            Q(from_user_id=user_id, status='completed') |
            Q(to_user_id=user_id, status='completed')
        ).count()

        response_rate = 0
        if total_sessions > 0:
            responded = Session.objects.filter(
                Q(from_user_id=user_id) | Q(to_user_id=user_id),
                status__in=['accepted', 'completed', 'cancelled']
            ).count()
            response_rate = round((responded / total_sessions) * 100)

        return Response({
            'avg_skill_rating': round(float(avg_skill), 1) if avg_skill else None,
            'avg_communication_rating': round(float(avg_comm), 1) if avg_comm else None,
            'avg_reliability_rating': round(float(avg_rel), 1) if avg_rel else None,
            'overall_rating': round(
                (float(avg_skill or 0) + float(avg_comm or 0) + float(avg_rel or 0)) / 3, 1
            ) if total_reviews > 0 else None,
            'total_reviews': total_reviews,
            'total_sessions': total_sessions,
            'response_rate': response_rate,
        })


# ============================================================
# Skill Exchange Sessions
# ============================================================

class SessionListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        filter_type = request.query_params.get('filter', 'all')

        if filter_type == 'upcoming':
            sessions = Session.objects.select_related('from_user', 'to_user').filter(
                Q(from_user=request.user, status__in=['accepted', 'in_progress']) |
                Q(to_user=request.user, status__in=['accepted', 'in_progress']),
                proposed_date__gte=timezone.now()
            ).order_by('proposed_date')
        elif filter_type == 'completed':
            sessions = Session.objects.select_related('from_user', 'to_user').filter(
                Q(from_user=request.user, status='completed') |
                Q(to_user=request.user, status='completed')
            )
        elif filter_type == 'pending':
            sessions = Session.objects.select_related('from_user', 'to_user').filter(
                to_user=request.user, status='pending'
            )
        else:
            sessions = Session.objects.select_related('from_user', 'to_user').filter(
                Q(from_user=request.user) | Q(to_user=request.user)
            )

        serializer = SessionSerializer(sessions, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = SessionSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            to_user_id = serializer.validated_data.get('to_user_id')
            if to_user_id == request.user.id:
                return Response(
                    {'error': 'Cannot create a session with yourself'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check for existing pending session
            existing = Session.objects.filter(
                from_user=request.user,
                to_user_id=to_user_id,
                status='pending'
            ).exists()
            if existing:
                return Response(
                    {'error': 'You already have a pending session request with this user'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            session = serializer.save(from_user=request.user)
            return Response(SessionSerializer(session, context={'request': request}).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SessionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            session = Session.objects.filter(pk=pk).filter(
                Q(from_user=request.user) | Q(to_user=request.user)
            ).first()
            if not session:
                return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)
            serializer = SessionSerializer(session, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, pk):
        session = Session.objects.filter(pk=pk).filter(
            Q(from_user=request.user) | Q(to_user=request.user)
        ).first()
        if not session:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = SessionSerializer(session, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        session = Session.objects.filter(pk=pk).filter(
            Q(from_user=request.user) | Q(to_user=request.user)
        ).first()
        if not session:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)
        session.delete()
        return Response({'message': 'Session deleted'}, status=status.HTTP_204_NO_CONTENT)


class SessionActionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, action):
        try:
            session = Session.objects.get(pk=pk, to_user=request.user)
        except Session.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

        if action == 'accept':
            if session.status != 'pending':
                return Response({'error': 'Session is not pending'}, status=status.HTTP_400_BAD_REQUEST)
            session.status = 'accepted'
        elif action == 'start':
            if session.status != 'accepted':
                return Response({'error': 'Session must be accepted first'}, status=status.HTTP_400_BAD_REQUEST)
            session.status = 'in_progress'
        elif action == 'complete':
            if session.status != 'in_progress':
                return Response({'error': 'Session must be in progress'}, status=status.HTTP_400_BAD_REQUEST)
            session.status = 'completed'
        elif action == 'cancel':
            if session.status in ('completed', 'cancelled'):
                return Response({'error': 'Cannot cancel a completed or cancelled session'}, status=status.HTTP_400_BAD_REQUEST)
            session.status = 'cancelled'
        elif action == 'reject':
            if session.status != 'pending':
                return Response({'error': 'Session is not pending'}, status=status.HTTP_400_BAD_REQUEST)
            session.status = 'rejected'
        else:
            return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

        session.save()
        return Response(SessionSerializer(session, context={'request': request}).data, status=status.HTTP_200_OK)


# ============================================================
# Seed Skills
# ============================================================

class SeedSkillsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)

        from django.core.management import call_command
        call_command('seed_skills')
        return Response({'message': 'Skills seeded successfully'}, status=status.HTTP_200_OK)
