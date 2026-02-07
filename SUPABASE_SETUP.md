# Supabase Setup Guide

This guide will help you set up Supabase for authentication and database in your Bank Balance application.

## Prerequisites

1. A Supabase account (sign up at [supabase.com](https://supabase.com))
2. A Supabase project created

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in your project details:
   - Name: `bank-balance` (or your preferred name)
   - Database Password: Choose a strong password (save this!)
   - Region: Choose the closest region to your users
4. Wait for the project to be created (takes ~2 minutes)

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys" → "anon public")

## Step 3: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Open `.env.local` and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

3. **Important**: Never commit `.env.local` to git (it's already in `.gitignore`)

## Step 4: Run Database Migration

You have two options to create the `monthly_balances` table:

### Option A: Using Supabase Dashboard (Recommended for beginners)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click "New Query"
4. Copy and paste the contents of `supabase/migrations/001_create_monthly_balances.sql`
5. Click "Run" (or press Ctrl+Enter)
6. Verify the table was created by going to **Table Editor** → you should see `monthly_balances`

### Option B: Using Supabase CLI (Advanced)

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref your-project-id
   ```

3. Run migrations:
   ```bash
   supabase db push
   ```

## Step 5: Verify Row Level Security (RLS)

1. Go to **Authentication** → **Policies** in your Supabase dashboard
2. Find the `monthly_balances` table
3. You should see 4 policies:
   - Users can view their own monthly balances
   - Users can insert their own monthly balances
   - Users can update their own monthly balances
   - Users can delete their own monthly balances

All policies should be enabled. If not, you can enable them manually or re-run the migration.

## Step 6: Configure Authentication

1. Go to **Authentication** → **URL Configuration** in your Supabase dashboard
2. Add your site URLs:
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: 
     - `http://localhost:3000/auth/callback`
     - `https://your-production-domain.com/auth/callback` (when deploying)

3. (Optional) Configure email templates:
   - Go to **Authentication** → **Email Templates**
   - Customize the confirmation email if desired

## Step 7: Test the Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000)
4. You should be redirected to `/login`
5. Try creating an account:
   - Enter an email and password
   - Check your email for the confirmation link (if email confirmation is enabled)
   - Sign in with your credentials

## Database Schema

The `monthly_balances` table has the following structure:

| Column      | Type    | Description                          |
|-------------|---------|--------------------------------------|
| id          | UUID    | Primary key (auto-generated)         |
| user_id     | UUID    | Foreign key to auth.users           |
| month_year  | DATE    | The month/year for this balance      |
| balance     | NUMERIC | The balance amount (15,2 precision)   |
| notes       | TEXT    | Optional notes about this balance    |
| created_at  | TIMESTAMP | Auto-generated creation timestamp   |
| updated_at  | TIMESTAMP | Auto-updated modification timestamp  |

### Unique Constraint

Each user can only have one balance record per month (`user_id`, `month_year`).

## Security Features

### Row Level Security (RLS)

All RLS policies ensure that:
- Users can **only** see their own data
- Users can **only** create records with their own `user_id`
- Users can **only** update/delete their own records

This is enforced at the database level, so even if there's a bug in your application code, users cannot access other users' data.

### Server-Side Rendering (SSR)

The app uses `@supabase/ssr` for secure server-side authentication:
- Session tokens are stored in HTTP-only cookies
- Auth state is managed server-side
- Protected routes are secured via middleware

## Troubleshooting

### "Invalid API key" error
- Double-check your `.env.local` file
- Make sure you're using the **anon/public** key, not the service role key
- Restart your dev server after changing `.env.local`

### "Table does not exist" error
- Make sure you've run the migration SQL
- Check that the table exists in Supabase dashboard → Table Editor

### "RLS policy violation" error
- Verify RLS policies are enabled in Supabase dashboard
- Check that you're authenticated (check browser cookies)
- Ensure `user_id` matches `auth.uid()` in your queries

### Redirect loop on login
- Check your redirect URLs in Supabase → Authentication → URL Configuration
- Make sure `NEXT_PUBLIC_SITE_URL` matches your actual site URL

## Next Steps

Once Supabase is set up:

1. **Add more features**:
   - Create forms to add/edit monthly balances
   - Add data visualization charts
   - Implement search and filtering

2. **Deploy to production**:
   - Update environment variables with production URLs
   - Add production redirect URLs in Supabase
   - Deploy your Next.js app (Vercel, Netlify, etc.)

3. **Enhance security**:
   - Enable email confirmation (optional but recommended)
   - Set up rate limiting
   - Add additional RLS policies if needed

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
