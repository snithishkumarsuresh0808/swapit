# SwapIt - Skill Swapping Platform

A modern skill-swapping web application where users can connect, share skills, and learn from each other.

## Features

- 🔐 **User Authentication** - Secure login/signup with token authentication
- 👤 **User Profiles** - Customizable profiles with profile pictures
- 📝 **Posts & Skills** - Create posts to share skills you can teach and want to learn
- 🤝 **Smart Matching** - AI-powered algorithm to find the best skill matches
- 💬 **Real-time Messaging** - Chat with matched users
- 📞 **WebRTC Calling** - Free peer-to-peer audio/video calls
- 🔗 **Connection System** - Send and accept connection requests
- 📅 **Calendar** - Manage your availability
- 🔔 **Notifications** - Real-time notifications for matches, messages, and connections
- 🌓 **Responsive Design** - Works on desktop and mobile

## Tech Stack

### Backend
- **Django** - Web framework
- **Django REST Framework** - API development
- **Django Channels** - WebSocket support for real-time features
- **PostgreSQL** - Database
- **Redis** - Channel layer for WebSocket
- **Daphne** - ASGI server

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **WebRTC** - Peer-to-peer calling

## Project Structure

```
SwapIt/
├── backend/
│   ├── accounts/          # User authentication & profiles
│   ├── chat/              # Messaging & calling (WebSocket)
│   ├── config/            # Django settings
│   ├── media/             # Uploaded files
│   └── manage.py
├── frontend/
│   ├── app/
│   │   ├── components/    # Reusable components
│   │   ├── calendar/      # Calendar page
│   │   ├── connect/       # Connection requests
│   │   ├── matches/       # Match finding
│   │   ├── messages/      # Messaging interface
│   │   ├── posts/         # Posts feed
│   │   └── ...
│   └── package.json
└── DEPLOYMENT_GUIDE.md    # Deployment instructions
```

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL (optional, SQLite works for development)
- Redis (optional for development)

### Backend Setup

1. **Clone the repository**
```bash
git clone https://github.com/snithishkumarsuresh0808/swapit.git
cd swapit/backend
```

2. **Create virtual environment**
```bash
python -m venv venv
# On Windows
venv\Scripts\activate
# On Mac/Linux
source venv/bin/activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Setup database**
```bash
python manage.py migrate
```

5. **Create superuser**
```bash
python manage.py createsuperuser
```

6. **Run development server**
```bash
python manage.py runserver
```

Backend will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend**
```bash
cd ../frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Run development server**
```bash
npm run dev
```

Frontend will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/accounts/signup/` - Register new user
- `POST /api/accounts/login/` - Login user
- `GET /api/accounts/profile/` - Get current user profile
- `PUT /api/accounts/profile/update/` - Update profile

### Posts
- `GET /api/posts/` - Get user's posts
- `POST /api/posts/create/` - Create new post
- `GET /api/posts/all/` - Get all posts

### Messages
- `GET /api/messages/conversations/` - Get all conversations
- `GET /api/messages/conversation/<user_id>/` - Get messages with user
- `POST /api/messages/send/` - Send message

### Connections
- `POST /api/messages/connections/send/` - Send connection request
- `GET /api/messages/connections/pending/` - Get pending requests
- `POST /api/messages/connections/<id>/respond/` - Accept/reject request
- `GET /api/messages/connections/status/<user_id>/` - Get connection status

### WebSocket
- `ws://localhost:8000/ws/call/<user_id>/` - WebRTC signaling

## Features in Detail

### Smart Matching Algorithm
The app uses an AI-powered matching algorithm that:
- Finds exact skill matches between users
- Performs fuzzy matching for similar skills
- Prioritizes mutual skill exchanges
- Considers availability alignment
- Ranks matches by compatibility score

### WebRTC Calling
Free peer-to-peer calling using WebRTC:
- Audio-only calls (default)
- Video calls (optional)
- No external services required
- Uses Google's free STUN servers
- WebSocket signaling through Django Channels

### Real-time Notifications
- Unread message count
- New match notifications
- Pending connection requests
- Auto-refresh every 5 seconds

## Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

### Quick Deploy (Free Options)
- **Backend**: Render.com
- **Frontend**: Vercel
- **Database**: PostgreSQL on Render
- **Redis**: Upstash or Redis Cloud

## Environment Variables

### Backend (.env)
```env
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://localhost:6379
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For issues and questions, please open an issue on GitHub.

## Acknowledgments

- Django and Django REST Framework community
- Next.js and React community
- WebRTC for free peer-to-peer communication
- All open-source contributors

---

**Built with ❤️ for skill sharing and learning**
