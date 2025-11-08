# Ringtone Setup

## ⚠️ These Files Are Optional!

The app works perfectly without these files. If missing:
- Calls still work with visual indicators
- No errors shown to users
- Users can upload custom ringtones via Settings

## Required Files

1. `ringtone.mp3` - Incoming call sound
2. `calling.mp3` - Outgoing call sound (dial tone)

## Quick Download Links

**Free ringtone MP3 files:**
- [Phone Ring 1](https://www.soundjay.com/phone/sounds/phone-ring-1.mp3) → Save as `ringtone.mp3`
- [Phone Calling](https://www.soundjay.com/phone/sounds/phone-calling-1.mp3) → Save as `calling.mp3`

**Other sources:**
- https://www.zedge.net/ringtones
- https://notificationsounds.com/
- https://freesound.org/

## Installation

1. Download the audio files
2. Rename to `ringtone.mp3` and `calling.mp3`
3. Place in this directory (`public/sounds/`)
4. Refresh your browser

## Format Requirements

- **Format:** MP3, WAV, or OGG
- **Duration:** 3-10 seconds (will loop)
- **Size:** Under 500KB recommended

## Custom Ringtones Feature

Users can upload personal ringtones:
- Go to Settings → Call Ringtones
- Upload any audio file (max 5MB)
- Set as active ringtone
- Stored in database per user

## Testing

1. Add files to this directory
2. Test incoming call: Have someone call you
3. Test outgoing call: Call someone
4. Check browser console for errors
5. Ensure browser allows audio autoplay
