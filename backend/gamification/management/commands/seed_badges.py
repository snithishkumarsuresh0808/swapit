from django.core.management.base import BaseCommand
from gamification.models import Badge, BADGE_DEFINITIONS


class Command(BaseCommand):
    help = 'Seed badge definitions'

    def handle(self, *args, **options):
        for badge_def in BADGE_DEFINITIONS:
            badge, created = Badge.objects.get_or_create(
                key=badge_def['key'],
                defaults={
                    'name': badge_def['name'],
                    'icon': badge_def['icon'],
                    'description': badge_def['description'],
                    'xp_reward': badge_def['xp_reward'],
                }
            )
            if created:
                self.stdout.write(f'  Created: {badge.icon} {badge.name}')
            else:
                self.stdout.write(f'  Exists:  {badge.icon} {badge.name}')
        self.stdout.write(self.style.SUCCESS(f'Seeded {len(BADGE_DEFINITIONS)} badges'))
