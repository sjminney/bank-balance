# Bank Balance - Fintech Dashboard

A sleek, minimalist fintech dashboard built with Next.js 15+ to track bank balances across multiple accounts.

## Features

- 🎨 **Quiet Luxury Dark Mode** - Elegant #09090b background with glassmorphism cards
- 🔐 **Supabase Authentication** - Secure server-side auth with @supabase/ssr
- 🗄️ **Database with RLS** - Row Level Security ensures users only see their own data
- 📱 **Progressive Web App** - Installable on iOS and Windows
- 🎭 **Smooth Animations** - Framer Motion powered transitions
- 🎯 **Modern Icons** - Lucide React with thin-stroke design
- 🧩 **shadcn/ui Components** - Beautiful, accessible UI components with rounded-2xl corners
- ⚡ **Next.js 15+** - Latest React Server Components and App Router
- 🎨 **Tailwind CSS** - Utility-first styling

## Getting Started

1. **Set up Supabase** (see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions):
   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Copy `.env.local.example` to `.env.local`
   - Add your Supabase credentials to `.env.local`
   - Run the database migration (see SUPABASE_SETUP.md)

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.
   - You'll be redirected to `/login` if not authenticated
   - Create an account or sign in to access the dashboard

## Project Structure

```
├── app/              # Next.js App Router pages
├── components/       # React components
├── lib/              # Utility functions
├── public/           # Static assets
└── styles/           # Global styles
```

## Design System

- **Background**: #09090b (Quiet Luxury dark)
- **Glassmorphism**: bg-white/5 with backdrop-blur-md
- **Border Radius**: rounded-2xl (1rem)
- **Icons**: Lucide React with strokeWidth={1.5}
- **Animations**: Framer Motion with 200-300ms transitions

## PWA Setup

The app is configured as a Progressive Web App. To install:
- **iOS**: Use Safari's "Add to Home Screen"
- **Windows**: Use Edge/Chrome's install prompt

## Tech Stack

- Next.js 15+
- TypeScript
- Supabase (Auth + Database)
- Tailwind CSS
- shadcn/ui
- Framer Motion
- Lucide React

## Database Schema

The app uses a `monthly_balances` table with:
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to auth.users
- `month_year` (DATE) - The month/year for this balance
- `balance` (NUMERIC) - The balance amount
- `notes` (TEXT) - Optional notes

All data is protected by Row Level Security (RLS) policies ensuring users can only access their own data.

## Deploy to Vercel (free)

1. **Create a Vercel account**  
   Go to [vercel.com](https://vercel.com) and sign up (GitHub, GitLab, or email).

2. **Push your code to GitHub** (if you haven’t already)  
   - Create a repo at [github.com/new](https://github.com/new)  
   - In your project folder:  
     `git init` → `git add .` → `git commit -m "Initial commit"` → `git branch -M main` → `git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git` → `git push -u origin main`

3. **Import the project on Vercel**  
   - Log in to Vercel → **Add New** → **Project**  
   - **Import** your GitHub repo (authorize GitHub if asked)  
   - Leave **Framework Preset** as Next.js and **Root Directory** as `.`  
   - Before deploying, open **Environment Variables** and add:

   | Name                         | Value                    |
   |-----------------------------|---------------------------|
   | `NEXT_PUBLIC_SUPABASE_URL`  | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon (public) key |
   | `NEXT_PUBLIC_SITE_URL`      | `https://your-project.vercel.app` (or leave blank and set after first deploy) |

   Get the Supabase values from: Supabase dashboard → **Project Settings** → **API** (Project URL and anon public key).

4. **Deploy**  
   Click **Deploy**. Vercel will build and host the app with HTTPS.

5. **Auth redirect (Supabase)**  
   After the first deploy you’ll have a URL like `https://bank-balance-xxx.vercel.app`.  
   - Set `NEXT_PUBLIC_SITE_URL` in Vercel to that URL (Project → Settings → Environment Variables), then redeploy if you had left it blank.  
   - In **Supabase** → **Authentication** → **URL Configuration**, set **Site URL** to `https://your-app.vercel.app` and add `https://your-app.vercel.app/**` to **Redirect URLs**.

## Documentation

- [Setup Guide](./SETUP.md) - General project setup
- [Supabase Setup](./SUPABASE_SETUP.md) - Detailed Supabase configuration guide
