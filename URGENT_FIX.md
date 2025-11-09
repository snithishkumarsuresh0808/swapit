# URGENT: Fix Media Files Not Showing

## The Problem
Your files ARE being uploaded to the backend, but they're being saved to **Render's ephemeral filesystem**, which means:
- ✅ Upload works
- ✅ Files are saved temporarily
- ❌ **Files are DELETED when the app restarts or redeploys**
- ❌ This is why images/videos disappear

## The Solution: Cloudinary (Required for Production)

### Quick Setup (5 minutes):

#### Step 1: Create Cloudinary Account
1. Go to: https://cloudinary.com/users/register_free
2. Sign up with email (no credit card needed)
3. Verify your email

#### Step 2: Get Credentials
1. Login to Cloudinary
2. You'll see your **Dashboard** immediately
3. Copy these 3 values:
   ```
   Cloud Name: dxxxxx
   API Key: 123456789012345
   API Secret: abcdefghijklmnopqrstuvwxyz
   ```

#### Step 3: Add to Render
1. Go to https://dashboard.render.com
2. Click your **backend** service (swapit-da9t)
3. Go to **"Environment"** tab
4. Click **"Add Environment Variable"**
5. Add these THREE variables:

   | Key | Value |
   |-----|-------|
   | `CLOUDINARY_CLOUD_NAME` | (paste your cloud name) |
   | `CLOUDINARY_API_KEY` | (paste your API key) |
   | `CLOUDINARY_API_SECRET` | (paste your API secret) |

6. Click **"Save Changes"**
7. Render will automatically redeploy (takes 2-3 minutes)

#### Step 4: Push Code
```bash
git push origin main
```

## What Happens After Setup

### Before Cloudinary:
```
User uploads image → Saved to /media/ → ❌ DELETED on redeploy
```

### After Cloudinary:
```
User uploads image → Saved to Cloudinary cloud → ✅ PERSISTS FOREVER
```

## How to Verify It's Working

1. After Render finishes redeploying
2. Upload a new image/video in a post
3. Check Render logs - you should see:
   ```
   📸 Received 1 images for upload
   ✅ Saved image: https://res.cloudinary.com/your-cloud/image/upload/...
   ```
4. The URL should start with `https://res.cloudinary.com` (not `/media/`)
5. Image will now load and persist forever!

## Current Status

✅ Code is ready (Cloudinary integration installed)
✅ Backend configured to use Cloudinary
✅ Local development works
❌ **Cloudinary credentials NOT SET on Render**

**Action needed: Add the 3 environment variables to Render**

## Troubleshooting

### Images still not loading after Cloudinary setup?
1. Check Render logs for errors
2. Verify all 3 environment variables are set correctly
3. Check that the deploy completed successfully
4. Try uploading a NEW image (old images are already gone)

### How to check if Cloudinary is active?
Look at the Render logs when uploading. The URL should be:
- ✅ Good: `https://res.cloudinary.com/dxxxxx/image/upload/v1234/...`
- ❌ Bad: `https://swapit-da9t.onrender.com/media/post_images/...`

## Free Tier Limits
- 25 GB storage
- 25 GB bandwidth/month
- More than enough for your app!
