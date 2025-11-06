import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import User

# Create admin user
username = 'admin'
email = 'admin@swapit.com'
password = 'admin123'

if User.objects.filter(username=username).exists():
    print(f'User "{username}" already exists')
else:
    user = User.objects.create_superuser(
        username=username,
        email=email,
        password=password,
        first_name='Admin',
        last_name='User'
    )
    print(f'Superuser created successfully!')
    print(f'Username: {username}')
    print(f'Email: {email}')
    print(f'Password: {password}')
