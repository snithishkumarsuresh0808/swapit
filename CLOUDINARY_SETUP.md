# Cloudinary Setup for Persistent Media Storage

## Why Cloudinary?

Render uses an **ephemeral filesystem**, which means:
- Uploaded files (images, videos) are stored temporarily
- All uploaded files are **deleted when the app redeploys**
- This causes media files to disappear after updates

Cloudinary provides free, persistent cloud storage for media files.

## Setup Instructions

### 1. Create Cloudinary Account
1. Go to https://cloudinary.com/users/register_free
2. Sign up for a free account (no credit card required)
3. Verify your email

### 2. Get Your Credentials
1. Log in to Cloudinary Dashboard
2. You'll see your credentials on the dashboard:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

### 3. Add to Render Environment Variables

On Render.com:
1. Go to your backend service
2. Click "Environment" tab
3. Add these environment variables:

```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

4. Click "Save Changes"
5. Render will automatically redeploy

### 4. Local Development (Optional)

Add to your `backend/.env` file:

```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## How It Works

- **With Cloudinary configured**: All uploads go to Cloudinary's servers and persist forever
- **Without Cloudinary**: Files are stored locally (works in development, fails in production after redeploy)

## Verification

After setup:
1. Upload an image/video in a post
2. Redeploy your app on Render
3. The image/video should still be visible (it's now stored on Cloudinary)

## Free Tier Limits

Cloudinary free tier includes:
- 25 GB storage
- 25 GB monthly bandwidth
- Plenty for small to medium projects

## Troubleshooting

If media files still don't work:
1. Check that environment variables are set correctly on Render
2. Check Render logs for any Cloudinary errors
3. Verify credentials in Cloudinary Dashboard
