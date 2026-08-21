from django.core.management.base import BaseCommand
from skills.models import SkillCategory, Skill


SKILL_DATA = {
    'Programming': {
        'icon': '💻',
        'skills': [
            ('Python', 'beginner'), ('Python', 'intermediate'), ('Python', 'advanced'),
            ('JavaScript', 'beginner'), ('JavaScript', 'intermediate'), ('JavaScript', 'advanced'),
            ('TypeScript', 'beginner'), ('TypeScript', 'intermediate'), ('TypeScript', 'advanced'),
            ('React', 'beginner'), ('React', 'intermediate'), ('React', 'advanced'),
            ('Angular', 'beginner'), ('Angular', 'intermediate'), ('Angular', 'advanced'),
            ('Vue.js', 'beginner'), ('Vue.js', 'intermediate'), ('Vue.js', 'advanced'),
            ('Next.js', 'beginner'), ('Next.js', 'intermediate'), ('Next.js', 'advanced'),
            ('Node.js', 'beginner'), ('Node.js', 'intermediate'), ('Node.js', 'advanced'),
            ('Django', 'beginner'), ('Django', 'intermediate'), ('Django', 'advanced'),
            ('Flask', 'beginner'), ('Flask', 'intermediate'), ('Flask', 'advanced'),
            ('Java', 'beginner'), ('Java', 'intermediate'), ('Java', 'advanced'),
            ('C++', 'beginner'), ('C++', 'intermediate'), ('C++', 'advanced'),
            ('C#', 'beginner'), ('C#', 'intermediate'), ('C#', 'advanced'),
            ('Swift', 'beginner'), ('Swift', 'intermediate'), ('Swift', 'advanced'),
            ('Kotlin', 'beginner'), ('Kotlin', 'intermediate'), ('Kotlin', 'advanced'),
            ('Go', 'beginner'), ('Go', 'intermediate'), ('Go', 'advanced'),
            ('Rust', 'beginner'), ('Rust', 'intermediate'), ('Rust', 'advanced'),
            ('Ruby', 'beginner'), ('Ruby', 'intermediate'), ('Ruby', 'advanced'),
            ('PHP', 'beginner'), ('PHP', 'intermediate'), ('PHP', 'advanced'),
            ('SQL', 'beginner'), ('SQL', 'intermediate'), ('SQL', 'advanced'),
            ('R', 'beginner'), ('R', 'intermediate'), ('R', 'advanced'),
            ('MATLAB', 'beginner'), ('MATLAB', 'intermediate'), ('MATLAB', 'advanced'),
            ('Scala', 'beginner'), ('Scala', 'intermediate'), ('Scala', 'advanced'),
        ],
    },
    'Design': {
        'icon': '🎨',
        'skills': [
            ('UI/UX Design', 'beginner'), ('UI/UX Design', 'intermediate'), ('UI/UX Design', 'advanced'),
            ('Figma', 'beginner'), ('Figma', 'intermediate'), ('Figma', 'advanced'),
            ('Adobe Photoshop', 'beginner'), ('Adobe Photoshop', 'intermediate'), ('Adobe Photoshop', 'advanced'),
            ('Adobe Illustrator', 'beginner'), ('Adobe Illustrator', 'intermediate'), ('Adobe Illustrator', 'advanced'),
            ('Adobe After Effects', 'beginner'), ('Adobe After Effects', 'intermediate'), ('Adobe After Effects', 'advanced'),
            ('Adobe Premiere Pro', 'beginner'), ('Adobe Premiere Pro', 'intermediate'), ('Adobe Premiere Pro', 'advanced'),
            ('Blender', 'beginner'), ('Blender', 'intermediate'), ('Blender', 'advanced'),
            ('Canva', 'beginner'), ('Canva', 'intermediate'), ('Canva', 'advanced'),
            ('Sketch', 'beginner'), ('Sketch', 'intermediate'), ('Sketch', 'advanced'),
            ('InVision', 'beginner'), ('InVision', 'intermediate'), ('InVision', 'advanced'),
            ('Adobe XD', 'beginner'), ('Adobe XD', 'intermediate'), ('Adobe XD', 'advanced'),
            ('Procreate', 'beginner'), ('Procreate', 'intermediate'), ('Procreate', 'advanced'),
            ('GIMP', 'beginner'), ('GIMP', 'intermediate'), ('GIMP', 'advanced'),
            ('3D Modeling', 'beginner'), ('3D Modeling', 'intermediate'), ('3D Modeling', 'advanced'),
            ('Motion Graphics', 'beginner'), ('Motion Graphics', 'intermediate'), ('Motion Graphics', 'advanced'),
        ],
    },
    'Languages': {
        'icon': '🌍',
        'skills': [
            ('English', 'beginner'), ('English', 'intermediate'), ('English', 'advanced'),
            ('Hindi', 'beginner'), ('Hindi', 'intermediate'), ('Hindi', 'advanced'),
            ('Tamil', 'beginner'), ('Tamil', 'intermediate'), ('Tamil', 'advanced'),
            ('Telugu', 'beginner'), ('Telugu', 'intermediate'), ('Telugu', 'advanced'),
            ('Japanese', 'beginner'), ('Japanese', 'intermediate'), ('Japanese', 'advanced'),
            ('Korean', 'beginner'), ('Korean', 'intermediate'), ('Korean', 'advanced'),
            ('Mandarin Chinese', 'beginner'), ('Mandarin Chinese', 'intermediate'), ('Mandarin Chinese', 'advanced'),
            ('Spanish', 'beginner'), ('Spanish', 'intermediate'), ('Spanish', 'advanced'),
            ('French', 'beginner'), ('French', 'intermediate'), ('French', 'advanced'),
            ('German', 'beginner'), ('German', 'intermediate'), ('German', 'advanced'),
            ('Italian', 'beginner'), ('Italian', 'intermediate'), ('Italian', 'advanced'),
            ('Portuguese', 'beginner'), ('Portuguese', 'intermediate'), ('Portuguese', 'advanced'),
            ('Arabic', 'beginner'), ('Arabic', 'intermediate'), ('Arabic', 'advanced'),
            ('Thai', 'beginner'), ('Thai', 'intermediate'), ('Thai', 'advanced'),
            ('Vietnamese', 'beginner'), ('Vietnamese', 'intermediate'), ('Vietnamese', 'advanced'),
        ],
    },
    'Business': {
        'icon': '📈',
        'skills': [
            ('Marketing', 'beginner'), ('Marketing', 'intermediate'), ('Marketing', 'advanced'),
            ('Digital Marketing', 'beginner'), ('Digital Marketing', 'intermediate'), ('Digital Marketing', 'advanced'),
            ('SEO', 'beginner'), ('SEO', 'intermediate'), ('SEO', 'advanced'),
            ('Social Media Marketing', 'beginner'), ('Social Media Marketing', 'intermediate'), ('Social Media Marketing', 'advanced'),
            ('Content Writing', 'beginner'), ('Content Writing', 'intermediate'), ('Content Writing', 'advanced'),
            ('Copywriting', 'beginner'), ('Copywriting', 'intermediate'), ('Copywriting', 'advanced'),
            ('Financial Planning', 'beginner'), ('Financial Planning', 'intermediate'), ('Financial Planning', 'advanced'),
            ('Accounting', 'beginner'), ('Accounting', 'intermediate'), ('Accounting', 'advanced'),
            ('Project Management', 'beginner'), ('Project Management', 'intermediate'), ('Project Management', 'advanced'),
            ('Business Strategy', 'beginner'), ('Business Strategy', 'intermediate'), ('Business Strategy', 'advanced'),
            ('Entrepreneurship', 'beginner'), ('Entrepreneurship', 'intermediate'), ('Entrepreneurship', 'advanced'),
            ('Sales', 'beginner'), ('Sales', 'intermediate'), ('Sales', 'advanced'),
            ('Public Speaking', 'beginner'), ('Public Speaking', 'intermediate'), ('Public Speaking', 'advanced'),
            ('Negotiation', 'beginner'), ('Negotiation', 'intermediate'), ('Negotiation', 'advanced'),
        ],
    },
    'Music': {
        'icon': '🎵',
        'skills': [
            ('Guitar', 'beginner'), ('Guitar', 'intermediate'), ('Guitar', 'advanced'),
            ('Piano', 'beginner'), ('Piano', 'intermediate'), ('Piano', 'advanced'),
            ('Violin', 'beginner'), ('Violin', 'intermediate'), ('Violin', 'advanced'),
            ('Drums', 'beginner'), ('Drums', 'intermediate'), ('Drums', 'advanced'),
            ('Bass Guitar', 'beginner'), ('Bass Guitar', 'intermediate'), ('Bass Guitar', 'advanced'),
            ('Flute', 'beginner'), ('Flute', 'intermediate'), ('Flute', 'advanced'),
            ('Singing', 'beginner'), ('Singing', 'intermediate'), ('Singing', 'advanced'),
            ('Music Production', 'beginner'), ('Music Production', 'intermediate'), ('Music Production', 'advanced'),
            ('DJ Skills', 'beginner'), ('DJ Skills', 'intermediate'), ('DJ Skills', 'advanced'),
            ('Audio Engineering', 'beginner'), ('Audio Engineering', 'intermediate'), ('Audio Engineering', 'advanced'),
            ('Ukulele', 'beginner'), ('Ukulele', 'intermediate'), ('Ukulele', 'advanced'),
            ('Harmonica', 'beginner'), ('Harmonica', 'intermediate'), ('Harmonica', 'advanced'),
        ],
    },
    'Fitness & Sports': {
        'icon': '🏋️',
        'skills': [
            ('Yoga', 'beginner'), ('Yoga', 'intermediate'), ('Yoga', 'advanced'),
            ('Meditation', 'beginner'), ('Meditation', 'intermediate'), ('Meditation', 'advanced'),
            ('Weight Training', 'beginner'), ('Weight Training', 'intermediate'), ('Weight Training', 'advanced'),
            ('Cardio Training', 'beginner'), ('Cardio Training', 'intermediate'), ('Cardio Training', 'advanced'),
            ('Swimming', 'beginner'), ('Swimming', 'intermediate'), ('Swimming', 'advanced'),
            ('Basketball', 'beginner'), ('Basketball', 'intermediate'), ('Basketball', 'advanced'),
            ('Football', 'beginner'), ('Football', 'intermediate'), ('Football', 'advanced'),
            ('Tennis', 'beginner'), ('Tennis', 'intermediate'), ('Tennis', 'advanced'),
            ('Martial Arts', 'beginner'), ('Martial Arts', 'intermediate'), ('Martial Arts', 'advanced'),
            ('Dance', 'beginner'), ('Dance', 'intermediate'), ('Dance', 'advanced'),
            ('Cooking', 'beginner'), ('Cooking', 'intermediate'), ('Cooking', 'advanced'),
            ('Photography', 'beginner'), ('Photography', 'intermediate'), ('Photography', 'advanced'),
            ('Video Editing', 'beginner'), ('Video Editing', 'intermediate'), ('Video Editing', 'advanced'),
            ('Drawing', 'beginner'), ('Drawing', 'intermediate'), ('Drawing', 'advanced'),
            ('Painting', 'beginner'), ('Painting', 'intermediate'), ('Painting', 'advanced'),
        ],
    },
    'Data Science': {
        'icon': '📊',
        'skills': [
            ('Machine Learning', 'beginner'), ('Machine Learning', 'intermediate'), ('Machine Learning', 'advanced'),
            ('Deep Learning', 'beginner'), ('Deep Learning', 'intermediate'), ('Deep Learning', 'advanced'),
            ('Data Analysis', 'beginner'), ('Data Analysis', 'intermediate'), ('Data Analysis', 'advanced'),
            ('Data Visualization', 'beginner'), ('Data Visualization', 'intermediate'), ('Data Visualization', 'advanced'),
            ('TensorFlow', 'beginner'), ('TensorFlow', 'intermediate'), ('TensorFlow', 'advanced'),
            ('PyTorch', 'beginner'), ('PyTorch', 'intermediate'), ('PyTorch', 'advanced'),
            ('Natural Language Processing', 'beginner'), ('Natural Language Processing', 'intermediate'), ('Natural Language Processing', 'advanced'),
            ('Computer Vision', 'beginner'), ('Computer Vision', 'intermediate'), ('Computer Vision', 'advanced'),
            ('Statistics', 'beginner'), ('Statistics', 'intermediate'), ('Statistics', 'advanced'),
            ('Power BI', 'beginner'), ('Power BI', 'intermediate'), ('Power BI', 'advanced'),
            ('Tableau', 'beginner'), ('Tableau', 'intermediate'), ('Tableau', 'advanced'),
            ('Excel Advanced', 'beginner'), ('Excel Advanced', 'intermediate'), ('Excel Advanced', 'advanced'),
        ],
    },
    'DevOps & Cloud': {
        'icon': '☁️',
        'skills': [
            ('AWS', 'beginner'), ('AWS', 'intermediate'), ('AWS', 'advanced'),
            ('Azure', 'beginner'), ('Azure', 'intermediate'), ('Azure', 'advanced'),
            ('Google Cloud', 'beginner'), ('Google Cloud', 'intermediate'), ('Google Cloud', 'advanced'),
            ('Docker', 'beginner'), ('Docker', 'intermediate'), ('Docker', 'advanced'),
            ('Kubernetes', 'beginner'), ('Kubernetes', 'intermediate'), ('Kubernetes', 'advanced'),
            ('CI/CD', 'beginner'), ('CI/CD', 'intermediate'), ('CI/CD', 'advanced'),
            ('Linux Administration', 'beginner'), ('Linux Administration', 'intermediate'), ('Linux Administration', 'advanced'),
            ('Git', 'beginner'), ('Git', 'intermediate'), ('Git', 'advanced'),
            ('Networking', 'beginner'), ('Networking', 'intermediate'), ('Networking', 'advanced'),
            ('Cybersecurity', 'beginner'), ('Cybersecurity', 'intermediate'), ('Cybersecurity', 'advanced'),
            ('Blockchain', 'beginner'), ('Blockchain', 'intermediate'), ('Blockchain', 'advanced'),
        ],
    },
}


class Command(BaseCommand):
    help = 'Seed the database with skill categories and skills'

    def handle(self, *args, **options):
        created_categories = 0
        created_skills = 0
        skipped = 0

        for order, (cat_name, data) in enumerate(SKILL_DATA.items()):
            category, cat_created = SkillCategory.objects.get_or_create(
                name=cat_name,
                defaults={'icon': data['icon'], 'order': order}
            )
            if cat_created:
                created_categories += 1

            for skill_name, level in data['skills']:
                _, skill_created = Skill.objects.get_or_create(
                    category=category,
                    name=skill_name,
                    level=level
                )
                if skill_created:
                    created_skills += 1
                else:
                    skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Seeded {created_categories} categories and {created_skills} skills '
                f'({skipped} already existed)'
            )
        )
