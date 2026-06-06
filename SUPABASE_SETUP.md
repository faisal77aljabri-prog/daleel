# Supabase Setup Guide for Daleel

This document guides you through setting up a free Supabase project for Daleel's authentication and profile storage.

## 1. Create a Supabase Project

1. Go to https://supabase.com and sign up (free tier is sufficient)
2. Create a new project:
   - **Name:** `daleel` (or your choice)
   - **Database Password:** Create a strong password
   - **Region:** Choose the closest to your users (e.g., `eu-west-1` for Europe, `us-east-1` for USA)
3. Wait for the project to initialize (~5 minutes)

## 2. Get Your API Keys

1. Navigate to **Settings → API** in your Supabase dashboard
2. Copy the following keys:
   - **Project URL** → `SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY`
3. Keep these safe (the anon key is public, but the project URL should not be shared)

## 3. Set Up Database Tables

### 3a. Enable Email Auth (Default)

1. Go to **Authentication → Providers**
2. Email is enabled by default — no action needed
3. (Optional) Configure email templates in **Authentication → Email Templates**

### 3b. Create Database Tables

Run the following SQL in the Supabase **SQL Editor**:

```sql
-- User Profiles Table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  gpa NUMERIC(4,2),
  gpa_math NUMERIC(4,2),
  school TEXT,
  major TEXT,
  country TEXT,
  funding TEXT,
  qudurat INT,
  tahsili INT,
  sat INT,
  sat_math INT,
  act INT,
  ap TEXT,
  ec_tier TEXT,
  ps_status TEXT,
  rec_count INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- EC Assessments Table
CREATE TABLE ec_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_strength TEXT,
  tier TEXT,
  summary TEXT,
  strengths JSONB,
  improvements JSONB,
  activity_ranking JSONB,
  honors_ranking JSONB,
  college_matches JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Saved Colleges Table (optional, for future expansion)
CREATE TABLE saved_colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  college_name TEXT NOT NULL,
  college_data JSONB,
  saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ec_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_colleges ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see/edit their own data
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own EC assessments" ON ec_assessments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own EC assessments" ON ec_assessments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own EC assessments" ON ec_assessments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own saved colleges" ON saved_colleges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved colleges" ON saved_colleges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved colleges" ON saved_colleges
  FOR DELETE USING (auth.uid() = user_id);
```

## 4. Add Environment Variables to Vercel

1. Go to your Vercel project → **Settings → Environment Variables**
2. Add:
   - **Name:** `SUPABASE_URL`
     **Value:** (paste your Project URL from step 2)
     **Environments:** Production, Preview, Development
   - **Name:** `SUPABASE_ANON_KEY`
     **Value:** (paste your anon public key from step 2)
     **Environments:** Production, Preview, Development
3. Redeploy your project

## 5. Test the Setup

1. Navigate to `https://yourdomain.vercel.app/auth.html`
2. Click "Create Account" and sign up with an email
3. Check Supabase dashboard → **Authentication → Users** to verify the user was created
4. Sign in with the credentials
5. Check the profile page — it should load your user data

## 6. Verify Database Access

In Supabase SQL Editor, run:

```sql
SELECT * FROM auth.users;
SELECT * FROM user_profiles;
SELECT * FROM ec_assessments;
```

You should see your test user in the `auth.users` table.

## Troubleshooting

- **"Supabase keys not configured" warning:** Make sure your env vars are set in Vercel and you've redeployed
- **CORS errors:** Supabase should allow all origins by default for the anon key
- **403 Forbidden on profile save:** Check Row Level Security policies are set up correctly (step 3b)
- **User created but no profile row:** Profiles are created on-demand when the user first saves data

## Next Steps

Phase B (deeper Q&A) will integrate Supabase data loading into the College List, EC, and Essay advisors, so they can pull saved profile data automatically.
