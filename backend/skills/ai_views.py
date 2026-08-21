"""
AI Features for SwapIt:
- Skill Recommendation (knowledge graph)
- Profile Assistant (NLP parsing)
- Post Generator (template generation)
"""
import re
from collections import defaultdict
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Profile, Post
from .models import Skill, SkillCategory


# ============================================================
# Skill Knowledge Graph — maps skills to related/recommended skills
# ============================================================

SKILL_GRAPH = {
    # Web Frontend
    'html': {'related': ['css', 'javascript', 'react', 'vue.js', 'web design'], 'category': 'Programming'},
    'css': {'related': ['html', 'javascript', 'react', 'sass', 'tailwind css', 'web design'], 'category': 'Programming'},
    'javascript': {'related': ['typescript', 'react', 'vue.js', 'angular', 'node.js', 'next.js', 'html', 'css'], 'category': 'Programming'},
    'typescript': {'related': ['javascript', 'react', 'angular', 'vue.js', 'node.js', 'next.js'], 'category': 'Programming'},
    'react': {'related': ['javascript', 'typescript', 'next.js', 'redux', 'node.js', 'vue.js', 'angular'], 'category': 'Programming'},
    'vue.js': {'related': ['javascript', 'typescript', 'react', 'nuxt.js', 'node.js'], 'category': 'Programming'},
    'angular': {'related': ['javascript', 'typescript', 'react', 'node.js'], 'category': 'Programming'},
    'next.js': {'related': ['react', 'javascript', 'typescript', 'node.js', 'react native'], 'category': 'Programming'},

    # Backend
    'node.js': {'related': ['javascript', 'typescript', 'react', 'express', 'next.js', 'mongodb'], 'category': 'Programming'},
    'python': {'related': ['django', 'flask', 'data analysis', 'machine learning', 'pandas', 'fastapi'], 'category': 'Programming'},
    'django': {'related': ['python', 'flask', 'postgresql', 'rest api', 'html', 'css', 'javascript'], 'category': 'Programming'},
    'flask': {'related': ['python', 'django', 'rest api', 'javascript'], 'category': 'Programming'},
    'java': {'related': ['spring boot', 'kotlin', 'android', 'hibernate'], 'category': 'Programming'},
    'c#': {'related': ['.net', 'unity', 'blazor', 'asp.net'], 'category': 'Programming'},
    'ruby': {'related': ['ruby on rails', 'javascript', 'python'], 'category': 'Programming'},
    'php': {'related': ['laravel', 'wordpress', 'mysql', 'javascript'], 'category': 'Programming'},
    'go': {'related': ['docker', 'kubernetes', 'microservices', 'rust'], 'category': 'Programming'},
    'rust': {'related': ['go', 'systems programming', 'webassembly', 'c++'], 'category': 'Programming'},
    'swift': {'related': ['ios development', 'xcode', 'objective-c', 'kotlin'], 'category': 'Programming'},
    'kotlin': {'related': ['android', 'java', 'swift', 'spring boot'], 'category': 'Programming'},

    # Data Science / ML
    'machine learning': {'related': ['deep learning', 'python', 'tensorflow', 'pytorch', 'data analysis', 'statistics'], 'category': 'Data Science'},
    'deep learning': {'related': ['machine learning', 'tensorflow', 'pytorch', 'computer vision', 'nlp'], 'category': 'Data Science'},
    'data analysis': {'related': ['python', 'r', 'excel advanced', 'sql', 'tableau', 'power bi', 'statistics'], 'category': 'Data Science'},
    'tensorflow': {'related': ['machine learning', 'deep learning', 'python', 'pytorch'], 'category': 'Data Science'},
    'pytorch': {'related': ['machine learning', 'deep learning', 'python', 'tensorflow'], 'category': 'Data Science'},
    'sql': {'related': ['python', 'data analysis', 'mysql', 'postgresql', 'database design'], 'category': 'Programming'},

    # DevOps
    'docker': {'related': ['kubernetes', 'ci/cd', 'aws', 'linux administration'], 'category': 'DevOps & Cloud'},
    'kubernetes': {'related': ['docker', 'ci/cd', 'aws', 'google cloud', 'linux administration'], 'category': 'DevOps & Cloud'},
    'aws': {'related': ['docker', 'kubernetes', 'python', 'ci/cd', 'google cloud', 'azure'], 'category': 'DevOps & Cloud'},
    'git': {'related': ['github', 'ci/cd', 'docker', 'linux administration'], 'category': 'DevOps & Cloud'},

    # Design
    'figma': {'related': ['ui/ux design', 'adobe photoshop', 'adobe illustrator', 'adobe xd', 'sketch'], 'category': 'Design'},
    'ui/ux design': {'related': ['figma', 'adobe xd', 'sketch', 'adobe photoshop', 'html', 'css', 'javascript'], 'category': 'Design'},
    'adobe photoshop': {'related': ['adobe illustrator', 'figma', 'ui/ux design', 'photography', 'adobe after effects'], 'category': 'Design'},
    'adobe illustrator': {'related': ['adobe photoshop', 'figma', 'ui/ux design', 'graphic design'], 'category': 'Design'},
    'adobe after effects': {'related': ['adobe premiere pro', 'motion graphics', 'video editing', 'adobe photoshop'], 'category': 'Design'},

    # Music
    'guitar': {'related': ['bass guitar', 'music theory', 'piano', 'ukulele', 'music production'], 'category': 'Music'},
    'piano': {'related': ['guitar', 'music theory', 'music production', 'violin'], 'category': 'Music'},
    'music production': {'related': ['audio engineering', 'guitar', 'piano', 'singing', 'music theory'], 'category': 'Music'},

    # Languages
    'english': {'related': ['content writing', 'copywriting', 'public speaking', 'toefl'], 'category': 'Languages'},
    'hindi': {'related': ['english', 'tamil', 'telugu', 'bengali'], 'category': 'Languages'},
    'japanese': {'related': ['mandarin chinese', 'korean', 'anime'], 'category': 'Languages'},

    # Business
    'digital marketing': {'related': ['seo', 'social media marketing', 'content writing', 'copywriting', 'google ads'], 'category': 'Business'},
    'seo': {'related': ['digital marketing', 'content writing', 'google analytics', 'social media marketing'], 'category': 'Business'},
    'content writing': {'related': ['copywriting', 'seo', 'digital marketing', 'english', 'blogging'], 'category': 'Business'},

    # Fitness
    'yoga': {'related': ['meditation', 'pilates', 'weight training', 'dance'], 'category': 'Fitness & Sports'},
    'cooking': {'related': ['baking', 'meal prep', 'indian cooking', 'italian cooking'], 'category': 'Fitness & Sports'},
    'photography': {'related': ['adobe photoshop', 'lightroom', 'video editing', 'graphic design'], 'category': 'Fitness & Sports'},
}


def normalize_skill(name):
    """Normalize a skill name for lookup."""
    return name.lower().strip()


def find_skill_in_graph(skill_name):
    """Find a skill in the knowledge graph, trying exact and fuzzy matches."""
    norm = normalize_skill(skill_name)
    # Exact match
    if norm in SKILL_GRAPH:
        return norm
    # Try without dots/spaces variations
    for key in SKILL_GRAPH:
        if key.replace('.', '').replace(' ', '') == norm.replace('.', '').replace(' ', ''):
            return key
    # Partial match
    for key in SKILL_GRAPH:
        if norm in key or key in norm:
            return key
    return None


# ============================================================
# AI Skill Recommendation
# ============================================================

class AISkillRecommendationView(APIView):
    """Given a list of skills the user has, recommend related skills they might want to learn."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        skills_input = request.data.get('skills', [])
        if not skills_input:
            return Response(
                {'error': 'Please provide at least one skill'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Find related skills from the knowledge graph
        recommended = defaultdict(lambda: {'score': 0, 'reasons': []})

        for skill in skills_input:
            graph_key = find_skill_in_graph(skill)
            if graph_key and graph_key in SKILL_GRAPH:
                for related_skill in SKILL_GRAPH[graph_key]['related']:
                    rec_norm = normalize_skill(related_skill)
                    # Skip if user already knows this skill
                    if any(normalize_skill(s) == rec_norm for s in skills_input):
                        continue
                    recommended[related_skill]['score'] += 1
                    recommended[related_skill]['reasons'].append(f'pairs well with {skill}')

        # Sort by score
        sorted_recs = sorted(recommended.items(), key=lambda x: x[1]['score'], reverse=True)

        # Build response - batch lookup skills in DB
        skill_names = [name for name, _ in sorted_recs[:15]]
        db_skills = {s.name.lower(): s for s in Skill.objects.filter(name__iname__in=skill_names).select_related('category')}
        
        results = []
        for skill_name, info in sorted_recs[:15]:
            db_skill = db_skills.get(skill_name.lower())
            results.append({
                'name': skill_name,
                'category': db_skill.category.name if db_skill else '',
                'relevance_score': info['score'],
                'reasons': info['reasons'][:3],
            })

        # Generate user match insight
        user = request.user
        match_insight = ''
        try:
            profile = user.profile
            my_post = Post.objects.filter(user=user).order_by('-created_at').first()
            my_skills_set = set(
                normalize_skill(s)
                for s in (my_post.skills if my_post else profile.skills)
                if s
            )

            # Find users who want what we can teach
            all_profiles = Profile.objects.exclude(user=user)
            potential_matches = 0
            for p in all_profiles:
                their_wanted = set(normalize_skill(s) for s in p.wanted_skills if s)
                if my_skills_set & their_wanted:
                    potential_matches += 1

            if potential_matches > 0:
                match_insight = (
                    f'Based on your skills, {potential_matches} user(s) '
                    f'may be a good match for you!'
                )
        except Exception:
            pass

        return Response({
            'your_skills': skills_input,
            'recommended_skills': results,
            'match_insight': match_insight,
        }, status=status.HTTP_200_OK)


# ============================================================
# AI Profile Assistant
# ============================================================

class AIProfileAssistantView(APIView):
    """Parse natural language input and generate structured profile data."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        text = request.data.get('text', '').strip()
        if not text:
            return Response(
                {'error': 'Please tell us about yourself'},
                status=status.HTTP_400_BAD_REQUEST
            )

        text_lower = text.lower()

        # Extract skills (things user knows/has)
        skills = []
        skill_patterns = [
            r'(?:i know|i can|i have|i\'m skilled in|i\'m good at|i\'m experienced in|i work with|i use)\s+(.+?)(?:\.|,|\band\b|$)',
            r'(?:familiar with|proficient in|versed in|background in)\s+(.+?)(?:\.|,|\band\b|$)',
        ]
        for pattern in skill_patterns:
            matches = re.findall(pattern, text_lower)
            for match in matches:
                parts = re.split(r',|\band\b|\+|/', match)
                for part in parts:
                    cleaned = part.strip().strip('.')
                    if cleaned and len(cleaned) > 1 and len(cleaned) < 50:
                        # Capitalize properly
                        proper = cleaned.title()
                        if proper not in skills:
                            skills.append(proper)

        # Extract wanted skills (things user wants to learn)
        wanted_skills = []
        want_patterns = [
            r'(?:i want to learn|i\'d like to learn|i want to know|i wish to learn|i\'m interested in learning|want to learn|wanna learn|learning)\s+(.+?)(?:\.|,|\band\b|$)',
            r'(?:looking to learn|trying to learn|hoping to learn|need to learn)\s+(.+?)(?:\.|,|\band\b|$)',
        ]
        for pattern in want_patterns:
            matches = re.findall(pattern, text_lower)
            for match in matches:
                parts = re.split(r',|\band\b|\+|/', match)
                for part in parts:
                    cleaned = part.strip().strip('.')
                    if cleaned and len(cleaned) > 1 and len(cleaned) < 50:
                        proper = cleaned.title()
                        if proper not in wanted_skills:
                            wanted_skills.append(proper)

        # Extract availability
        availability = []
        day_names = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        if 'weekday' in text_lower or 'weekdays' in text_lower:
            availability = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        elif 'weekend' in text_lower or 'weekends' in text_lower:
            availability = ['Saturday', 'Sunday']
        elif 'everyday' in text_lower or 'every day' in text_lower or 'daily' in text_lower:
            availability = [d.title() for d in day_names]
        else:
            for day in day_names:
                if day in text_lower:
                    availability.append(day.title())

        # Time slots
        time_slots = []
        if 'morning' in text_lower:
            time_slots.append('Morning')
        if 'afternoon' in text_lower:
            time_slots.append('Afternoon')
        if 'evening' in text_lower:
            time_slots.append('Evening')
        if 'night' in text_lower:
            time_slots.append('Night')

        # Generate about me text
        about_parts = []
        if 'student' in text_lower:
            if 'cs' in text_lower or 'computer science' in text_lower:
                about_parts.append('Computer Science student')
            else:
                about_parts.append('Student')
        if 'engineer' in text_lower or 'developer' in text_lower:
            if 'full stack' in text_lower or 'fullstack' in text_lower:
                about_parts.append('Full Stack Developer')
            elif 'frontend' in text_lower or 'front-end' in text_lower:
                about_parts.append('Frontend Developer')
            elif 'backend' in text_lower or 'back-end' in text_lower:
                about_parts.append('Backend Developer')
            else:
                about_parts.append('Developer')

        about_me = ''
        if about_parts:
            about_me = f"{' / '.join(about_parts)}"
        if skills:
            about_me += f" with experience in {', '.join(skills[:3])}"
        if wanted_skills:
            about_me += f". Currently learning {', '.join(wanted_skills[:2])}"
        about_me += '.'

        # Also find matching skill suggestions from the graph
        wanted_skills_lower = {s.lower() for s in wanted_skills}
        skills_lower = {s.lower() for s in skills}
        seen = set()
        unique_suggestions = []
        for skill in skills:
            graph_key = find_skill_in_graph(skill)
            if graph_key and graph_key in SKILL_GRAPH:
                for related in SKILL_GRAPH[graph_key]['related']:
                    rel_lower = related.lower()
                    if rel_lower not in wanted_skills_lower and rel_lower not in skills_lower and rel_lower not in seen:
                        seen.add(rel_lower)
                        unique_suggestions.append(related)

        return Response({
            'original_text': text,
            'generated_profile': {
                'about_me': about_me,
                'skills': skills,
                'wanted_skills': wanted_skills,
                'availability': availability,
                'time_slots': time_slots,
            },
            'suggested_wanted_skills': unique_suggestions[:8],
            'confidence': 'high' if skills and wanted_skills else 'medium' if skills or wanted_skills else 'low',
        }, status=status.HTTP_200_OK)


# ============================================================
# AI Post Generator
# ============================================================

class AIPostGeneratorView(APIView):
    """Generate a full post from a simple text description."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        text = request.data.get('text', '').strip()
        if not text:
            return Response(
                {'error': 'Please describe what you can teach and what you want to learn'},
                status=status.HTTP_400_BAD_REQUEST
            )

        text_lower = text.lower()

        # Extract teach skills
        teach_skills = []
        teach_patterns = [
            r'(?:i can teach|i teach|i\'m good at teaching|can help you learn|can teach you|i know how to teach)\s+(.+?)(?:\.|,|\band\b|$)',
            r'(?:teach|teaching)\s+(.+?)(?:\.|,|\band\b|$)',
        ]
        for pattern in teach_patterns:
            matches = re.findall(pattern, text_lower)
            for match in matches:
                parts = re.split(r',|\band\b|\+|/', match)
                for part in parts:
                    cleaned = part.strip().strip('.')
                    if cleaned and len(cleaned) > 1 and len(cleaned) < 50:
                        proper = cleaned.title()
                        if proper not in teach_skills:
                            teach_skills.append(proper)

        # Extract want skills
        want_skills = []
        want_patterns = [
            r'(?:want to learn|wanna learn|want to know|learning|interested in learning|looking to learn)\s+(.+?)(?:\.|,|\band\b|$)',
        ]
        for pattern in want_patterns:
            matches = re.findall(pattern, text_lower)
            for match in matches:
                parts = re.split(r',|\band\b|\+|/', match)
                for part in parts:
                    cleaned = part.strip().strip('.')
                    if cleaned and len(cleaned) > 1 and len(cleaned) < 50:
                        proper = cleaned.title()
                        if proper not in want_skills:
                            want_skills.append(proper)

        # If no structured extraction, try general patterns
        if not teach_skills and not want_skills:
            # Fallback: look for skill names anywhere
            all_known_skills = set()
            for key, val in SKILL_GRAPH.items():
                all_known_skills.add(key)
                all_known_skills.update(val['related'])

            words = re.findall(r'[a-zA-Z]+(?:\s[a-zA-Z]+)?', text_lower)
            for i, word in enumerate(words):
                compound = word
                if i + 1 < len(words):
                    compound = word + ' ' + words[i + 1]
                if compound in all_known_skills:
                    # Determine if it's teach or want based on context
                    context_before = ' '.join(words[max(0, i-3):i])
                    if any(w in context_before for w in ['teach', 'know', 'can', 'good']):
                        teach_skills.append(compound.title())
                    elif any(w in context_before for w in ['learn', 'want', 'interested']):
                        want_skills.append(compound.title())

        # Determine availability from text
        availability = []
        day_names = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        if 'weekday' in text_lower:
            availability = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        elif 'weekend' in text_lower:
            availability = ['Saturday', 'Sunday']
        elif 'everyday' in text_lower or 'every day' in text_lower:
            availability = [d.title() for d in day_names]
        else:
            for day in day_names:
                if day in text_lower:
                    availability.append(day.title())

        # Determine level
        level = 'Beginner'
        if any(w in text_lower for w in ['advanced', 'experienced', 'expert', 'professional']):
            level = 'Advanced'
        elif any(w in text_lower for w in ['intermediate', 'some experience', 'comfortable']):
            level = 'Intermediate'

        # Generate title
        title = ''
        if teach_skills:
            title = f"Learn {teach_skills[0]} with Me!"
        elif want_skills:
            title = f"Looking to Learn {want_skills[0]}"

        # Generate description sections
        teach_section = []
        if teach_skills:
            teach_section.append(f"I can help you learn:")
            # Add specific subtopics based on the skill
            for skill in teach_skills[:3]:
                skill_lower = skill.lower()
                subtopics = _get_subtopics(skill_lower)
                if subtopics:
                    teach_section.append(f"\n{skill}:")
                    for st in subtopics[:5]:
                        teach_section.append(f"• {st}")

        want_section = []
        if want_skills:
            want_section.append(f"\nIn exchange, I'd love to learn:")
            for skill in want_skills[:3]:
                want_section.append(f"• {skill}")

        description = '\n'.join(teach_section + want_section)

        # Generate availability text
        avail_text = ''
        if availability:
            avail_text = f"Available: {', '.join(availability)}"
        else:
            avail_text = "Available: Flexible"

        return Response({
            'original_text': text,
            'generated_post': {
                'title': title,
                'description': description,
                'skills': teach_skills,
                'wanted_skills': want_skills,
                'availability': availability,
                'level': level,
                'time_slots': [],
            },
            'avail_text': avail_text,
            'confidence': 'high' if teach_skills and want_skills else 'medium' if teach_skills or want_skills else 'low',
        }, status=status.HTTP_200_OK)


def _get_subtopics(skill_name):
    """Return common subtopics for a skill."""
    subtopics_map = {
        'python': ['Python Fundamentals', 'OOP', 'Functions & Modules', 'File Handling', 'APIs & Web Scraping'],
        'javascript': ['Variables & Types', 'DOM Manipulation', 'ES6+ Features', 'Async/Await', 'APIs'],
        'react': ['Components & JSX', 'State & Props', 'Hooks', 'Routing', 'Context API'],
        'django': ['Models & ORM', 'Views & URLs', 'Templates', 'Forms', 'REST APIs'],
        'node.js': ['Express Basics', 'REST APIs', 'Database Integration', 'Authentication', 'Middleware'],
        'typescript': ['Type System', 'Interfaces', 'Generics', 'Decorators', 'Configuration'],
        'html': ['Semantic HTML', 'Forms & Validation', 'Accessibility', 'SEO Basics', 'HTML5 APIs'],
        'css': ['Flexbox & Grid', 'Responsive Design', 'Animations', 'CSS Variables', 'Tailwind CSS'],
        'guitar': ['Chords', 'Strumming Patterns', 'Fingerpicking', 'Music Theory', 'Scales'],
        'piano': ['Scales & Chords', 'Reading Sheet Music', 'Rhythm', 'Improvisation', 'Songs'],
        'yoga': ['Sun Salutations', 'Standing Poses', 'Seated Poses', 'Breathing', 'Meditation'],
        'machine learning': ['Supervised Learning', 'Unsupervised Learning', 'Model Evaluation', 'Feature Engineering', 'Neural Networks'],
        'data analysis': ['Pandas & NumPy', 'Data Cleaning', 'Visualization', 'Statistics', 'SQL Queries'],
        'figma': ['Interface Design', 'Prototyping', 'Components', 'Auto Layout', 'Design Systems'],
        'digital marketing': ['SEO Basics', 'Social Media Strategy', 'Content Marketing', 'Analytics', 'Paid Ads'],
        'cooking': ['Knife Skills', 'Sauces & Soups', 'Baking Basics', 'Meal Prep', 'World Cuisines'],
        'photography': ['Composition', 'Lighting', 'Editing', 'Portrait Photography', 'Landscape'],
    }
    return subtopics_map.get(skill_name, [])
