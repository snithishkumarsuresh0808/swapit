# SwapIt - Complete Application Flow Chart

> Comprehensive flowcharts and diagrams for the SwapIt skill-swapping platform

## Table of Contents
1. [System Architecture](#1-system-architecture-overview)
2. [User Authentication Flow](#2-user-authentication-flow)
3. [Profile & Post Creation](#3-profile--post-creation-flow)
4. [Matching & Discovery](#4-matching--discovery-flow)
5. [Connection Request Flow](#5-connection-request-flow)
6. [Messaging Flow](#6-messaging-flow)
7. [WebRTC Calling Flow](#7-webrtc-calling-flow)
8. [Settings Management](#8-settings--profile-management-flow)
9. [Complete User Journey](#9-complete-user-journey-flow)
10. [Database Relationships](#10-database-entity-relationship)
11. [API Request/Response](#11-api-requestresponse-flow)
12. [Technology Stack](#12-technology-stack-flow)

---

## 1. System Architecture Overview

```mermaid
graph TB
    User[User/Browser] --> Frontend[Next.js Frontend<br/>Port 3000]
    Frontend --> Backend[Django Backend<br/>Port 8001]
    Frontend --> WS[WebSocket<br/>Django Channels]
    Backend --> DB[(SQLite/PostgreSQL<br/>Database)]
    WS --> Redis[(Redis<br/>Channel Layer)]
    Backend --> Media[Media Storage<br/>Profile Images, Posts]
```

---

## 2. User Authentication Flow

```mermaid
graph TD
    Start([User Opens App]) --> CheckAuth{Authenticated?}
    CheckAuth -->|No| Login[Login Page]
    CheckAuth -->|Yes| Dashboard[Dashboard/Feed]

    Login --> EnterCreds[Enter Email & Password]
    EnterCreds --> APILogin[POST /api/auth/login/]
    APILogin --> ValidCreds{Valid?}
    ValidCreds -->|Yes| SaveToken[Save Token to<br/>LocalStorage]
    ValidCreds -->|No| ShowError[Show Error Message]
    ShowError --> Login
    SaveToken --> Dashboard

    Login --> SignupLink[New User?]
    SignupLink --> Signup[Signup Page]
    Signup --> EnterDetails[Enter User Details<br/>Name, Email, Phone, Password]
    EnterDetails --> APISignup[POST /api/auth/signup/]
    APISignup --> CreateUser[Create User Account]
    CreateUser --> AutoLogin[Auto Login with Token]
    AutoLogin --> Dashboard
```

---

## 3. Profile & Post Creation Flow

```mermaid
graph TD
    Dashboard[Dashboard] --> ProfileCheck{Has Profile?}
    ProfileCheck -->|No| CreateProfile[Profile Creation Page]
    ProfileCheck -->|Yes| ViewFeed[View Feed]

    CreateProfile --> EnterSkills[Enter Skills & Availability<br/>- Skills You Have<br/>- Skills You Want<br/>- Days Available<br/>- Time Slots]
    EnterSkills --> UploadImage[Upload Profile Image<br/>Optional]
    UploadImage --> SubmitProfile[POST /api/profile/]
    SubmitProfile --> CreatePost[Create Initial Post]

    ViewFeed --> PostsPage[Posts Management]
    PostsPage --> CreateNewPost[Create New Post]
    CreateNewPost --> EnterPostDetails[Enter Post Details<br/>- Skills<br/>- Wanted Skills<br/>- Availability<br/>- Media Files]
    EnterPostDetails --> UploadMedia[Upload Images/Videos<br/>Optional]
    UploadMedia --> SubmitPost[POST /api/posts/]
    SubmitPost --> ShowInFeed[Post Shows in Feed]

    PostsPage --> EditPost[Edit Existing Post]
    EditPost --> UpdatePost[PUT /api/posts/id/]
    UpdatePost --> ShowInFeed

    PostsPage --> DeletePost[Delete Post]
    DeletePost --> RemovePost[DELETE /api/posts/id/]
```

---

## 4. Matching & Discovery Flow

```mermaid
graph TD
    Feed[Main Feed] --> ViewAllPosts[GET /api/posts/all/]
    ViewAllPosts --> DisplayPosts[Display All User Posts]

    DisplayPosts --> FilterMatch[Client-Side Matching<br/>Algorithm]
    FilterMatch --> ExactMatch{Exact Skill<br/>Match?}
    ExactMatch -->|Yes| HighScore[High Match Score]
    ExactMatch -->|No| FuzzyMatch[Fuzzy Matching<br/>Similar Skills]
    FuzzyMatch --> MediumScore[Medium Match Score]

    HighScore --> MatchesPage[Matches Page]
    MediumScore --> MatchesPage

    MatchesPage --> SortMatches[Sort by Score<br/>& Availability]
    SortMatches --> DisplayMatches[Display Ranked Matches]

    DisplayMatches --> ViewUserProfile[Click User Profile]
    ViewUserProfile --> ShowProfile[GET /api/posts/all/<br/>Filter by User]
    ShowProfile --> ProfileDetails[Show User Skills<br/>Posts & Availability]

    ProfileDetails --> SendRequest[Send Connection Request]
```

---

## 5. Connection Request Flow

```mermaid
graph TD
    Matches[View Matches] --> SendConn[Click Connect Button]
    SendConn --> CheckStatus[GET /api/messages/connections/<br/>status/user_id/]
    CheckStatus --> Status{Connection<br/>Status?}

    Status -->|None| SendRequest[POST /api/messages/<br/>connections/send/]
    Status -->|Pending| ShowPending[Show Pending Status]
    Status -->|Accepted| ChatButton[Show Chat Button]

    SendRequest --> CreateConnection[Create Connection Record<br/>Status: Pending]
    CreateConnection --> NotifyUser[Notify Receiver]

    Connect[Connect Page] --> ViewPending[GET /api/messages/<br/>connections/pending/]
    ViewPending --> ShowRequests[Display Pending Requests]

    ShowRequests --> AcceptReject{User Action?}
    AcceptReject -->|Accept| Accept[POST /api/messages/connections/<br/>id/respond/<br/>action: accept]
    AcceptReject -->|Reject| Reject[POST /api/messages/connections/<br/>id/respond/<br/>action: reject]

    Accept --> UpdateStatus[Update Status: Accepted]
    Reject --> UpdateStatus2[Update Status: Rejected]

    UpdateStatus --> EnableChat[Enable Chat & Calling]
    UpdateStatus2 --> RemoveRequest[Remove from List]
```

---

## 6. Messaging Flow

```mermaid
graph TD
    Dashboard[Dashboard] --> Messages[Messages Page]
    Messages --> GetConvos[GET /api/messages/<br/>conversations/]
    GetConvos --> ShowConvos[Display All Conversations<br/>With Unread Count]

    ShowConvos --> SelectConvo[Click Conversation]
    SelectConvo --> GetMessages[GET /api/messages/<br/>conversation/user_id/]
    GetMessages --> DisplayChat[Display Chat Messages]

    DisplayChat --> TypeMessage[User Types Message]
    TypeMessage --> SendMsg[Click Send]
    SendMsg --> PostMessage[POST /api/messages/send/<br/>receiver_id, content]
    PostMessage --> SaveDB[Save to Database]
    SaveDB --> UpdateUI[Update Chat UI]

    UpdateUI --> MarkRead[Mark as Read<br/>is_read: true]
    MarkRead --> Refresh[Auto Refresh Every 5s]
    Refresh --> GetMessages

    DisplayChat --> CallButton[Click Call Button]
    CallButton --> WebRTCFlow[Initiate WebRTC Call]
```

---

## 7. WebRTC Calling Flow

```mermaid
graph TD
    ChatPage[Chat Page] --> InitCall[Click Call Button]
    InitCall --> ConnectWS[Connect to WebSocket<br/>ws://localhost:8001/ws/call/user_id/]

    ConnectWS --> CreateOffer[Caller Creates<br/>WebRTC Offer]
    CreateOffer --> SendOffer[Send Offer via WebSocket<br/>type: offer]

    SendOffer --> RecvOffer[Receiver Gets Offer]
    RecvOffer --> ShowIncoming[Show Incoming Call UI]
    ShowIncoming --> AcceptCall{Accept Call?}

    AcceptCall -->|Yes| CreateAnswer[Create WebRTC Answer]
    AcceptCall -->|No| SendReject[Send Reject Message]

    CreateAnswer --> SendAnswer[Send Answer via WebSocket<br/>type: answer]
    SendAnswer --> RecvAnswer[Caller Gets Answer]

    RecvAnswer --> ExchangeICE[Exchange ICE Candidates<br/>via WebSocket]
    ExchangeICE --> EstablishP2P[Establish P2P Connection]

    EstablishP2P --> ActiveCall[Active Call<br/>Audio/Video Stream]
    ActiveCall --> ToggleVideo[Toggle Video On/Off]
    ActiveCall --> ToggleMute[Toggle Mute On/Off]
    ActiveCall --> EndCall[End Call]

    EndCall --> CleanupPeer[Cleanup PeerConnection]
    CleanupPeer --> CloseWS[Close WebSocket]
    CloseWS --> BackToChat[Return to Chat]

    SendReject --> BackToChat
```

---

## 8. Settings & Profile Management Flow

```mermaid
graph TD
    Dashboard[Dashboard] --> Settings[Settings Page]
    Settings --> LoadProfile[GET /api/profile/]
    LoadProfile --> ShowSettings[Display Current Settings<br/>- Profile Image<br/>- Personal Info<br/>- Skills]

    ShowSettings --> UpdateImage[Update Profile Image]
    UpdateImage --> UploadNew[Upload New Image]
    UploadNew --> SaveImage[POST /api/auth/<br/>update-profile/<br/>FormData]
    SaveImage --> UpdateDB[Update Database]

    ShowSettings --> ChangePass[Change Password]
    ChangePass --> EnterPasswords[Enter Old & New Password]
    EnterPasswords --> SubmitPass[POST /api/auth/<br/>change-password/]
    SubmitPass --> ValidatePass{Valid?}
    ValidatePass -->|Yes| UpdatePass[Update Password]
    ValidatePass -->|No| ShowPassError[Show Error]

    UpdateDB --> RefreshUI[Refresh UI]
    UpdatePass --> ShowSuccess[Show Success Message]
    ShowPassError --> ChangePass
```

---

## 9. Complete User Journey Flow

```mermaid
graph TD
    Start([New User Visits App]) --> Signup[Sign Up]
    Signup --> CreateProf[Create Profile<br/>Skills & Availability]
    CreateProf --> CreatePost1[Create Initial Post]

    CreatePost1 --> Browse[Browse Feed]
    Browse --> FindMatch[Find Matching Users<br/>Via Matches Page]
    FindMatch --> SendReq[Send Connection Request]

    SendReq --> WaitAccept[Wait for Acceptance]
    WaitAccept --> Accepted{Accepted?}
    Accepted -->|Yes| StartChat[Start Chatting]
    Accepted -->|No| FindMatch

    StartChat --> ScheduleCall[Schedule or<br/>Initiate Call]
    ScheduleCall --> VideoCall[Have Video Call<br/>Exchange Skills]

    VideoCall --> LearnSkill[Learn New Skill]
    LearnSkill --> UpdateProfile[Update Profile<br/>Add New Skill]
    UpdateProfile --> CreatePost2[Create New Post<br/>Share Knowledge]
    CreatePost2 --> FindMatch

    FindMatch --> Repeat[Repeat Cycle<br/>Continuous Learning]
```

---

## 10. Database Entity Relationship

```mermaid
erDiagram
    USER ||--o{ POST : creates
    USER ||--o{ MESSAGE : sends
    USER ||--o{ MESSAGE : receives
    USER ||--o{ CONNECTION : initiates
    USER ||--o{ CONNECTION : receives
    USER ||--|| PROFILE : has
    POST ||--o{ POST_IMAGE : contains
    POST ||--o{ POST_VIDEO : contains

    USER {
        int id PK
        string email UK
        string username
        string first_name
        string last_name
        string phone_number
        string profile_image
        string password
    }

    PROFILE {
        int id PK
        int user_id FK
        json skills
        json wanted_skills
        json availability
        json time_slots
        datetime created_at
        datetime updated_at
    }

    POST {
        int id PK
        int user_id FK
        json skills
        json wanted_skills
        json availability
        json time_slots
        datetime created_at
        datetime updated_at
    }

    POST_IMAGE {
        int id PK
        int post_id FK
        string image
        datetime uploaded_at
    }

    POST_VIDEO {
        int id PK
        int post_id FK
        string video
        datetime uploaded_at
    }

    CONNECTION {
        int id PK
        int from_user_id FK
        int to_user_id FK
        string status
        datetime created_at
        datetime updated_at
    }

    MESSAGE {
        int id PK
        int sender_id FK
        int receiver_id FK
        text content
        boolean is_read
        datetime created_at
    }
```

---

## 11. API Request/Response Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant F as Next.js Frontend
    participant API as Django REST API
    participant DB as Database
    participant WS as WebSocket Server
    participant R as Redis

    Note over B,R: Authentication Flow
    B->>F: Enter Credentials
    F->>API: POST /api/auth/login/
    API->>DB: Validate User
    DB-->>API: User Data
    API-->>F: Token + User Info
    F->>B: Store Token, Redirect

    Note over B,R: Post Creation Flow
    B->>F: Create Post Form
    F->>API: POST /api/posts/<br/>Authorization: Token
    API->>DB: Save Post
    DB-->>API: Post Created
    API-->>F: Post Data
    F->>B: Update Feed

    Note over B,R: Messaging Flow
    B->>F: Send Message
    F->>API: POST /api/messages/send/<br/>Authorization: Token
    API->>DB: Save Message
    DB-->>API: Message Saved
    API-->>F: Success
    F->>B: Update Chat UI

    Note over B,R: WebRTC Calling Flow
    B->>F: Initiate Call
    F->>WS: Connect WebSocket
    WS->>R: Store Connection
    F->>WS: Send Offer
    WS->>R: Publish to Channel
    R-->>WS: Broadcast to Peer
    WS-->>F: Deliver Offer
    F->>B: Establish P2P
```

---

## 12. Technology Stack Flow

```mermaid
graph LR
    subgraph Frontend["Frontend (Port 3000)"]
        UI[React Components<br/>TypeScript]
        Router[Next.js App Router]
        State[LocalStorage State]
        WebRTC[WebRTC Client]
    end

    subgraph Backend["Backend (Port 8001)"]
        Django[Django 5.0]
        DRF[Django REST Framework]
        Channels[Django Channels]
        Auth[Token Authentication]
    end

    subgraph Storage["Data Storage"]
        DB[(SQLite/PostgreSQL)]
        Redis[(Redis Cache)]
        Media[Media Files]
    end

    UI --> Router
    Router --> DRF
    WebRTC --> Channels
    DRF --> Auth
    Auth --> DB
    Channels --> Redis
    Django --> Media
    DRF --> DB
```

---

## Key Features Summary

### 🔐 Authentication
- Token-based authentication
- Email as username
- Secure password hashing

### 👤 Profile Management
- Skills showcase
- Availability calendar
- Profile images

### 🤝 Smart Matching
- Exact skill matching
- Fuzzy matching algorithm
- Availability alignment
- Compatibility scoring

### 💬 Real-time Messaging
- One-to-one chat
- Unread message tracking
- Auto-refresh conversations

### 📞 WebRTC Calling
- Peer-to-peer audio/video
- WebSocket signaling
- No external services

### 🔗 Connection System
- Request/Accept flow
- Status tracking (pending/accepted/rejected)
- Privacy controls

### 📱 Responsive Design
- Mobile-friendly UI
- Tailwind CSS styling
- Modern UX patterns

---

## API Endpoints Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup/` | Register new user |
| POST | `/api/auth/login/` | Login user |
| POST | `/api/auth/change-password/` | Change password |
| POST | `/api/auth/update-profile/` | Update profile image |

### Profile & Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile/` | Get current user profile |
| GET | `/api/profiles/` | Get all profiles |
| GET | `/api/posts/` | Get user's posts |
| POST | `/api/posts/` | Create new post |
| GET | `/api/posts/all/` | Get all posts |
| GET | `/api/posts/:id/` | Get specific post |
| PUT | `/api/posts/:id/` | Update post |
| DELETE | `/api/posts/:id/` | Delete post |

### Messages & Connections
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages/conversations/` | Get all conversations |
| GET | `/api/messages/conversation/:userId/` | Get messages with user |
| POST | `/api/messages/send/` | Send message |
| POST | `/api/messages/connections/send/` | Send connection request |
| GET | `/api/messages/connections/pending/` | Get pending requests |
| POST | `/api/messages/connections/:id/respond/` | Accept/reject request |
| GET | `/api/messages/connections/status/:userId/` | Get connection status |

### WebSocket
| Endpoint | Description |
|----------|-------------|
| `ws://localhost:8001/ws/call/:userId/` | WebRTC signaling channel
