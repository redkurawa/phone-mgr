# Google OAuth Authentication Plan

## Overview
Implement Google OAuth authentication for the Phone Number Manager app with:
- Login with Google
- Role-based access (Admin vs Regular User)
- Approval system for new users
- User management page

## Architecture

### Database Schema (users table)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  image VARCHAR(500),
  role VARCHAR(20) DEFAULT 'user', -- 'admin' or 'user'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Authentication Flow
1. User visits app → redirect to login
2. User clicks "Sign in with Google"
3. Google OAuth callback → create/update user record
4. If first user → auto-approve as admin
5. If user status is 'pending' → show "waiting approval" page
6. If user status is 'approved' → allow access

### Role Permissions
- **Admin**: Full access (CRUD on phones, manage users)
- **User (approved)**: Read-only access to phone numbers

## Implementation Steps

### Step 1: Install Dependencies
- next-auth (v4 for Next.js 14)
- @next-auth/drizzle-adapter
- uuid

### Step 2: Create Users Table
- Add to drizzle/schema.ts

### Step 3: Configure NextAuth
- Create auth options
- Setup Google provider
- Create users table adapter

### Step 4: Create Auth API Routes
- /api/auth/[...nextauth] - authentication endpoints
- /api/auth/signin - sign in page
- /api/auth/signout - sign out
- /api/auth/callback/google - OAuth callback

### Step 5: Create Login Page
- /login - login page with Google sign-in button
- /waiting - waiting for approval page

### Step 6: User Management (Admin)
- /admin/users - list all users
- Admin can approve/reject pending users
- Admin can change user roles

### Step 7: Protect Routes
- Wrap app with session provider
- Add middleware to protect routes
- Show/hide features based on role

## Files to Create/Modify

### New Files
- `drizzle/schema.ts` - add users table
- `app/api/auth/[...nextauth]/route.ts` - NextAuth handler
- `lib/auth.ts` - auth utilities
- `app/login/page.tsx` - login page
- `app/waiting/page.tsx` - waiting approval page
- `app/admin/users/page.tsx` - user management

### Modify Files
- `middleware.ts` - protect routes
- `app/layout.tsx` - add session provider
- `app/page.tsx` - hide admin features for non-admin

## Environment Variables Needed
```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=random-secret-string
```

## Security Considerations
- All API routes check session and role
- Admin routes verify admin role
- User approval required before access
- Session timeout: 30 days
