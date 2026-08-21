"""
SwapIt Backend API Test Script — Steps 1-6
Tests all 15 endpoints + auth flow + matching + messaging
"""
import requests
import json
import sys
import time
from datetime import datetime, timedelta

BASE = "http://localhost:8001"
PASS = 0
FAIL = 0
USERS = {}

def test(name, method, url, token=None, data=None, expect_status=None):
    global PASS, FAIL
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Token {token}"
    try:
        r = requests.request(method, f"{BASE}{url}", json=data, headers=headers, timeout=10)
        if expect_status and r.status_code != expect_status:
            print(f"  FAIL {name}: expected {expect_status}, got {r.status_code} — {r.text[:200]}")
            FAIL += 1
            return None
        print(f"  PASS {name}: {r.status_code}")
        PASS += 1
        return r.json() if r.status_code != 204 else {}
    except Exception as e:
        print(f"  FAIL {name}: {e}")
        FAIL += 1
        return None

print("=" * 60)
print("STEP 1: BACKEND API VERIFICATION")
print("=" * 60)

# ── 1. Signup ──
print("\n1. SIGNUP")
for i, user_data in enumerate([
    {"username": "alice_teach", "email": "alice@test.com", "password": "pass1234", "first_name": "Alice", "last_name": "Teacher"},
    {"username": "bob_teach", "email": "bob@test.com", "password": "pass1234", "first_name": "Bob", "last_name": "Builder"},
    {"username": "carol_teach", "email": "carol@test.com", "password": "pass1234", "first_name": "Carol", "last_name": "Coder"},
], 1):
    d = test(f"Signup user{i}", "POST", "/api/auth/signup/", data=user_data, expect_status=201)
    if d:
        USERS[user_data["username"]] = {"token": d.get("token"), "id": d.get("user", {}).get("id"), "data": d.get("user")}

# ── 2. Login ──
print("\n2. LOGIN")
for username in ["alice_teach", "bob_teach", "carol_teach"]:
    d = test(f"Login {username}", "POST", "/api/auth/login/", data={"email": f"{username.split('_')[0]}@test.com", "password": "pass1234"}, expect_status=200)
    if d and "token" in d:
        USERS[username]["token"] = d["token"]

alice_token = USERS.get("alice_teach", {}).get("token")
bob_token = USERS.get("bob_teach", {}).get("token")
carol_token = USERS.get("carol_teach", {}).get("token")

# Test invalid login
    test("Login invalid creds", "POST", "/api/auth/login/", data={"email": "alice@test.com", "password": "wrong"}, expect_status=401)

# ── 3. Profile ──
print("\n3. PROFILE CREATE/UPDATE")
if alice_token:
    test("Get profile (may be 404 if new)", "GET", "/api/profile/", token=alice_token, expect_status=None)
    test("Create/update Alice profile", "POST", "/api/profile/", token=alice_token, data={
        "skills": ["Python", "Django", "JavaScript"],
        "wanted_skills": ["React", "TypeScript", "Machine Learning"],
        "availability": ["Monday", "Wednesday", "Friday", "Saturday"],
        "time_slots": ["morning", "afternoon"]
    }, expect_status=None)

if bob_token:
    test("Create/update Bob profile", "POST", "/api/profile/", token=bob_token, data={
        "skills": ["React", "TypeScript", "Node.js"],
        "wanted_skills": ["Python", "Django", "Go"],
        "availability": ["Monday", "Wednesday", "Saturday", "Sunday"],
        "time_slots": ["morning", "evening"]
    }, expect_status=None)

if carol_token:
    test("Create/update Carol profile", "POST", "/api/profile/", token=carol_token, data={
        "skills": ["Java", "C++", "Machine Learning"],
        "wanted_skills": ["Python", "React"],
        "availability": ["Tuesday", "Thursday", "Saturday"],
        "time_slots": ["afternoon", "evening"]
    }, expect_status=None)

# ── 4. Skills ──
print("\n4. SKILLS")
if alice_token:
    test("Get skill categories", "GET", "/api/skills/categories/", token=alice_token, expect_status=200)
    test("Get skill list", "GET", "/api/skills/list/", token=alice_token, expect_status=200)
    test("Search skills", "GET", "/api/skills/list/?search=python", token=alice_token, expect_status=200)

# ── 5. Create Posts ──
print("\n5. CREATE POSTS")
if alice_token:
    alice_post = test("Alice create post", "POST", "/api/posts/", token=alice_token, data={
        "skills": ["Python", "Django"],
        "wanted_skills": ["React", "TypeScript"],
        "availability": ["Monday", "Wednesday", "Friday", "Saturday"],
        "time_slots": ["morning", "afternoon"]
    }, expect_status=201)

if bob_token:
    bob_post = test("Bob create post", "POST", "/api/posts/", token=bob_token, data={
        "skills": ["React", "TypeScript"],
        "wanted_skills": ["Python", "Django"],
        "availability": ["Monday", "Wednesday", "Saturday", "Sunday"],
        "time_slots": ["morning", "evening"]
    }, expect_status=201)

if carol_token:
    carol_post = test("Carol create post", "POST", "/api/posts/", token=carol_token, data={
        "skills": ["Java", "C++"],
        "wanted_skills": ["Python", "React"],
        "availability": ["Tuesday", "Thursday", "Saturday"],
        "time_slots": ["afternoon"]
    }, expect_status=201)

# ── 6. Get Feed ──
print("\n6. GET FEED")
if alice_token:
    test("Get all posts (feed)", "GET", "/api/posts/all/", token=alice_token, expect_status=200)
    test("Get my posts", "GET", "/api/posts/", token=alice_token, expect_status=200)

# ── 7. Matching ──
print("\n7. MATCHING")
if alice_token:
    matches = test("Discover matches (Alice)", "GET", "/api/skills/discover/", token=alice_token, expect_status=200)
    if matches:
        print(f"    -> Found {matches.get('total', 0)} matches, {len(matches.get('top_matches', []))} top matches")
        for m in matches.get('top_matches', [])[:3]:
            print(f"    -> Top match: {m['user']['username']} (score: {m['match_score']})")

if bob_token:
    matches = test("Discover matches (Bob)", "GET", "/api/skills/discover/", token=bob_token, expect_status=200)
    if matches:
        print(f"    -> Found {matches.get('total', 0)} matches, {len(matches.get('top_matches', []))} top matches")

# ── 8. Connection Request ──
print("\n8. CONNECTION REQUEST")
alice_id = USERS.get("alice_teach", {}).get("id")
bob_id = USERS.get("bob_teach", {}).get("id")
carol_id = USERS.get("carol_teach", {}).get("id")

if alice_token and bob_id:
    test("Alice → Bob connection", "POST", "/api/messages/connections/send/", token=alice_token, data={"to_user_id": bob_id}, expect_status=201)

if bob_token and carol_id:
    test("Bob → Carol connection", "POST", "/api/messages/connections/send/", token=bob_token, data={"to_user_id": carol_id}, expect_status=201)

# ── 9. Accept/Reject Connection ──
print("\n9. ACCEPT/REJECT CONNECTION")
if bob_token and alice_id:
    # Get pending requests to find the connection ID
    pending = test("Bob get pending requests", "GET", "/api/messages/connections/pending/", token=bob_token, expect_status=200)
    if pending and len(pending) > 0:
        conn_id = pending[0]["id"]
        test("Bob accepts Alice", "POST", f"/api/messages/connections/{conn_id}/respond/", token=bob_token, data={"action": "accept"}, expect_status=200)

if carol_token and bob_id:
    pending = test("Carol get pending requests", "GET", "/api/messages/connections/pending/", token=carol_token, expect_status=200)
    if pending and len(pending) > 0:
        conn_id = pending[0]["id"]
        test("Carol rejects Bob", "POST", f"/api/messages/connections/{conn_id}/respond/", token=carol_token, data={"action": "reject"}, expect_status=200)

# Re-send Bob→Carol so they're connected for testing
if bob_token and carol_id:
    test("Bob → Carol re-send", "POST", "/api/messages/connections/send/", token=bob_token, data={"to_user_id": carol_id}, expect_status=201)
    pending = test("Carol pending again", "GET", "/api/messages/connections/pending/", token=carol_token, expect_status=200)
    if pending and len(pending) > 0:
        conn_id = pending[0]["id"]
        test("Carol accepts Bob", "POST", f"/api/messages/connections/{conn_id}/respond/", token=carol_token, data={"action": "accept"}, expect_status=200)

# ── 10. Conversations ──
print("\n10. CONVERSATIONS")
if alice_token:
    test("Alice conversations", "GET", "/api/messages/conversations/", token=alice_token, expect_status=200)

# ── 11. Send Message ──
print("\n11. SEND MESSAGE")
if alice_token and bob_id:
    test("Alice → Bob msg1", "POST", "/api/messages/send/", token=alice_token, data={"receiver_id": bob_id, "content": "Hey Bob! I can teach you Python"}, expect_status=201)
    test("Alice → Bob msg2", "POST", "/api/messages/send/", token=alice_token, data={"receiver_id": bob_id, "content": "And I'd love to learn React from you"}, expect_status=201)

if bob_token and alice_id:
    test("Bob → Alice reply", "POST", "/api/messages/send/", token=bob_token, data={"receiver_id": alice_id, "content": "Sounds great Alice! When are you free?"}, expect_status=201)

# Get messages
if alice_token and bob_id:
    test("Alice reads Bob messages", "GET", f"/api/messages/conversation/{bob_id}/", token=alice_token, expect_status=200)

if bob_token and alice_id:
    test("Bob reads Alice messages", "GET", f"/api/messages/conversation/{alice_id}/", token=bob_token, expect_status=200)
    test("Bob conversations (check unread)", "GET", "/api/messages/conversations/", token=bob_token, expect_status=200)

# ── 12. Sessions ──
print("\n12. SESSIONS")
if alice_token and bob_id:
    session_date = (datetime.now() + timedelta(days=1)).isoformat()
    sess = test("Alice → Bob session request", "POST", "/api/skills/sessions/", token=alice_token, data={
        "to_user_id": bob_id,
        "skill_name": "React",
        "skill_description": "Learn React basics and hooks",
        "proposed_date": session_date,
        "duration": 60,
        "notes": "First session, excited!"
    }, expect_status=201)

    if sess:
        session_id = sess["id"]
        test("Alice view sessions", "GET", "/api/skills/sessions/", token=alice_token, expect_status=200)
        test("Bob view sessions", "GET", "/api/skills/sessions/", token=bob_token, expect_status=200)
        test("Get session detail", "GET", f"/api/skills/sessions/{session_id}/", token=bob_token, expect_status=200)

        # Accept
        test("Bob accepts session", "POST", f"/api/skills/sessions/{session_id}/accept/", token=bob_token, expect_status=200)
        # Start
        test("Bob starts session", "POST", f"/api/skills/sessions/{session_id}/start/", token=bob_token, expect_status=200)
        # Complete
        test("Bob completes session", "POST", f"/api/skills/sessions/{session_id}/complete/", token=bob_token, expect_status=200)

# ── 13. Reviews ──
print("\n13. REVIEWS")
if alice_token and bob_id:
    test("Alice reviews Bob", "POST", "/api/skills/reviews/", token=alice_token, data={
        "reviewed_user_id": bob_id,
        "session_id_str": "session-1",
        "skill_rating": 5,
        "communication_rating": 5,
        "reliability_rating": 4,
        "comment": "Great React teacher! Very patient and clear.",
        "skills_taught": ["React", "TypeScript"]
    }, expect_status=201)

if bob_token and alice_id:
    test("Bob reviews Alice", "POST", "/api/skills/reviews/", token=bob_token, data={
        "reviewed_user_id": alice_id,
        "session_id_str": "session-1",
        "skill_rating": 5,
        "communication_rating": 5,
        "reliability_rating": 5,
        "comment": "Alice is an amazing Python mentor!",
        "skills_taught": ["Python"]
    }, expect_status=201)

if alice_token:
    test("Alice reputation", "GET", f"/api/skills/reputation/{alice_id}/", token=alice_token, expect_status=200)

# ── 14. Gamification ──
print("\n14. GAMIFICATION")
if alice_token:
    gam = test("Alice gamification dashboard", "GET", "/api/gamification/", token=alice_token, expect_status=200)
    if gam:
        print(f"    -> Level: {gam.get('level_info', {}).get('level')}, XP: {gam.get('xp')}, Badges: {len(gam.get('badges', []))}")

    test("All badges", "GET", "/api/gamification/badges/", token=alice_token, expect_status=200)
    test("Skill progress", "GET", "/api/gamification/skill-progress/", token=alice_token, expect_status=200)
    test("Add skill progress", "POST", "/api/gamification/skill-progress/", token=alice_token, data={"skill_name": "React", "progress": 25}, expect_status=201)
    test("Leaderboard", "GET", "/api/gamification/leaderboard/", token=alice_token, expect_status=200)

# ── 15. WebRTC Signaling ──
print("\n15. WEBRTC SIGNALING")
if alice_token and bob_id:
    test("Alice sends call signal", "POST", "/api/messages/calls/signal/", token=alice_token, data={
        "recipient_id": bob_id, "signal_type": "call-offer", "payload": {"sdp": "mock-sdp", "type": "offer"}
    }, expect_status=201)
    test("Bob polls signals", "GET", "/api/messages/calls/signal/", token=bob_token, expect_status=200)
    test("Alice polls signals", "GET", "/api/messages/calls/signal/", token=alice_token, expect_status=200)

# ── Extra: Password Change ──
print("\nEXTRAS")
if alice_token:
    test("Change password", "POST", "/api/auth/change-password/", token=alice_token, data={"old_password": "pass1234", "new_password": "pass1234"}, expect_status=200)

# ── Summary ──
print("\n" + "=" * 60)
print(f"RESULTS: {PASS} passed, {FAIL} failed out of {PASS + FAIL} total")
print("=" * 60)

# Save tokens for Step 2
print("\nTOKENS FOR STEP 2:")
for u, d in USERS.items():
    print(f"  {u}: {d.get('token', 'NONE')}")
