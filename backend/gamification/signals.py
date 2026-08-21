from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from django.utils import timezone

from .models import UserXP, Badge, UserBadge, XPLog, SkillProgress, BADGE_DEFINITIONS


def get_or_create_xp(user):
    xp_obj, _ = UserXP.objects.get_or_create(user=user)
    return xp_obj


def award_xp(user, amount, reason):
    xp_obj = get_or_create_xp(user)
    xp_obj.add_xp(amount, reason)
    return xp_obj


def check_and_award_badges(user):
    xp_obj = get_or_create_xp(user)
    earned_keys = set(UserBadge.objects.filter(user=user).values_list('badge__key', flat=True))
    all_badges = {b['key']: b for b in BADGE_DEFINITIONS}

    new_badges = []

    from accounts.models import Profile
    from chat.models import Connection, Message
    from skills.models import Review, Session
    from accounts.models import Post

    conditions = {}

    completed_sessions = Session.objects.filter(
        from_user=user, status='completed'
    ).count() + Session.objects.filter(
        to_user=user, status='completed'
    ).count()
    conditions['first_exchange'] = completed_sessions >= 1
    conditions['five_sessions'] = completed_sessions >= 5
    conditions['sessions_10'] = completed_sessions >= 10

    connections = Connection.objects.filter(
        status='accepted'
    ).filter(from_user=user).count() + Connection.objects.filter(
        status='accepted'
    ).filter(to_user=user).count()
    conditions['connections_10'] = connections >= 10
    conditions['connections_25'] = connections >= 25

    reviews_given = Review.objects.filter(reviewer=user).count()
    conditions['helpful_mentor'] = reviews_given >= 5

    unique_reviewers = Review.objects.filter(
        reviewed_user=user, skill_rating=5
    ).values('reviewer').distinct().count()
    conditions['top_teacher'] = unique_reviewers >= 3

    conditions['streak_7'] = xp_obj.login_streak >= 7

    conditions['first_post'] = Post.objects.filter(user=user).exists()
    conditions['first_message'] = Message.objects.filter(sender=user).exists()

    for key, earned in conditions.items():
        if earned and key not in earned_keys and key in all_badges:
            badge_def = all_badges[key]
            badge, _ = Badge.objects.get_or_create(
                key=key,
                defaults={
                    'name': badge_def['name'],
                    'icon': badge_def['icon'],
                    'description': badge_def['description'],
                    'xp_reward': badge_def['xp_reward'],
                }
            )
            UserBadge.objects.create(user=user, badge=badge)
            if badge.xp_reward > 0:
                xp_obj.add_xp(badge.xp_reward, f'Badge: {badge.name}')
            new_badges.append(badge)

    return new_badges


@receiver(post_save, sender='skills.Session')
def session_completed(sender, instance, **kwargs):
    if instance.status != 'completed':
        return
    for user in [instance.from_user, instance.to_user]:
        xp_obj = get_or_create_xp(user)
        sessions_count = Session.objects.filter(from_user=user, status='completed').count() + \
            Session.objects.filter(to_user=user, status='completed').count()
        if sessions_count == 1:
            award_xp(user, 50, 'First exchange completed')
        else:
            award_xp(user, 20, 'Session completed')
        sp, _ = SkillProgress.objects.get_or_create(user=user, skill_name=instance.skill_name)
        sp.sessions_completed += 1
        sp.progress = min(100, sp.sessions_completed * 10)
        sp.save()
        check_and_award_badges(user)


@receiver(post_save, sender='skills.Review')
def review_created(sender, instance, created, **kwargs):
    if not created:
        return
    award_xp(instance.reviewer, 5, 'Left a review')
    check_and_award_badges(instance.reviewer)


@receiver(post_save, sender='chat.Connection')
def connection_made(sender, instance, **kwargs):
    if instance.status != 'accepted':
        return
    for user in [instance.from_user, instance.to_user]:
        award_xp(user, 5, 'New connection')
        check_and_award_badges(user)


@receiver(post_save, sender='chat.Message')
def message_sent(sender, instance, created, **kwargs):
    if not created:
        return
    xp_obj = get_or_create_xp(instance.sender)
    first_msg = not XPLog.objects.filter(user=instance.sender, reason='Sent first message').exists()
    if first_msg:
        award_xp(instance.sender, 10, 'Sent first message')
        check_and_award_badges(instance.sender)


@receiver(post_save, sender='accounts.Post')
def post_created(sender, instance, created, **kwargs):
    if not created:
        return
    xp_obj = get_or_create_xp(instance.user)
    first_post = not XPLog.objects.filter(user=instance.user, reason='Created first post').exists()
    if first_post:
        award_xp(instance.user, 10, 'Created first post')
        check_and_award_badges(instance.user)
