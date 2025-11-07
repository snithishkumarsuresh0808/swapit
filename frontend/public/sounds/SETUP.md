# Sound Files Setup

## Required Sound Files

Place these audio files in this directory (`public/sounds/`):

### 1. Incoming Call Ringtone
- **File Name:** `ringtone.mp3`
- **Purpose:** Plays when you receive a call
- **Duration:** 3-10 seconds (will loop)

### 2. Outgoing Call Ringtone
- **File Name:** `calling.mp3`
- **Purpose:** Plays when you make a call (waiting for answer)
- **Duration:** 3-10 seconds (will loop)

### 3. Preset Ringtones (Optional)
- `classic.mp3` - Classic phone ring
- `digital.mp3` - Digital beep sound
- `melodic.mp3` - Melodic tone

## Format Requirements

- **Format:** MP3, WAV, or OGG
- **Size:** Under 500KB recommended per file
- **Quality:** 128kbps is sufficient

## Recommended Sources

- **Free Ringtones:** https://www.zedge.net/ringtones
- **Notification Sounds:** https://notificationsounds.com/
- **Create Your Own:** Use Audacity (free audio editor)
- **Online Generator:** https://www.online-convert.com/

## Fallback Behavior

If sound files are missing:
- App will use Web Audio API to generate simple beep sounds
- No errors will be shown to users

## Custom Ringtones (New Feature!)

Users can now upload their own ringtones through the app:
- Go to Settings → Call Ringtone section
- Click "Upload" button under "Custom Ringtone"
- Select audio file from device (max 5MB)
- Ringtones are stored in backend database
- Each user can have multiple custom ringtones
- Each ringtone has its own delete button
- Set any ringtone as active

## Testing

1. Add sound files to this directory
2. Test incoming call: Have someone call you
3. Test outgoing call: Call someone and wait
4. Check browser console for any audio errors
5. Ensure browser allows audio autoplay
