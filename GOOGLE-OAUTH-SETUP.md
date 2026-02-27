# Google OAuth Setup Guide

## Step 1: Go to Google Cloud Console
1. Open https://console.cloud.google.com/
2. Login with your Google account
3. Create a new project or select existing one

## Step 2: Enable Google+ API (OAuth 2.0)
1. In the left sidebar, go to **APIs & Services** → **Library**
2. Search for "Google+ API" or "People API"
3. Click on **Google People API** and click **Enable**

## Step 3: Configure OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type
3. Fill in the required fields:
   - **App name**: Phone Manager (or your preferred name)
   - **User support email**: your email
   - **Developer contact information**: your email
4. Click **Save and Continue**
5. On Scopes page, click **Add or remove scopes**
6. Add these scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
7. Click **Save and Continue**
8. On Test users page, add your Google email as a test user
9. Click **Save and Continue**

## Step 4: Create OAuth Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Web application** as application type
4. Fill in:
   - **Name**: Phone Manager Web Client
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000`
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google`
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

## Step 5: Add to .env file
Add these to your `.env` file:
```env
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-random-string-here
```

## Step 6: Generate NEXTAUTH_SECRET
Run this command to generate a random secret:
```bash
openssl rand -base64 32
```

## Quick Links
- Google Cloud Console: https://console.cloud.google.com/
- OAuth Consent Screen: https://console.cloud.google.com/apis/credentials/consent
- Credentials: https://console.cloud.google.com/apis/credentials
