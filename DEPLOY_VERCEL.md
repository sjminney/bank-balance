# Deploy Bank Balance to Vercel

## 1. Push your code to GitHub

If you haven’t already, put the project in a Git repo and push to GitHub:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

(Use your real GitHub username and repo name.)

---

## 2. Import the project in Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub is easiest).
2. Click **Add New…** → **Project**.
3. **Import** your GitHub repo (e.g. `Bank Balance` or whatever you named it).
4. Vercel will detect Next.js. Leave **Framework Preset** as Next.js and **Root Directory** blank unless the app lives in a subfolder.
5. **Do not** deploy yet — add environment variables first (step 3).

---

## 3. Add environment variables

In the Vercel import screen (or later in **Project → Settings → Environment Variables**), add:

| Name | Value | Environment |
|------|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (from Supabase Dashboard → Settings → API) | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key (same place) | Production, Preview, Development |

Optional (for auth redirects and emails):

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SITE_URL` | Your Vercel URL, e.g. `https://your-app.vercel.app` |

Then click **Deploy**.

---

## 4. Configure Supabase for production

So login/signup and redirects work from your Vercel URL:

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **URL Configuration**.
2. Set **Site URL** to your Vercel URL, e.g. `https://your-app.vercel.app`.
3. Under **Redirect URLs**, add:
   - `https://your-app.vercel.app/**`
   - `https://your-app.vercel.app/auth/callback`

Replace `your-app` with your actual Vercel project name (e.g. `bank-balance-abc123`).

---

## 5. Deploy and open the app

After the first deploy finishes, Vercel will show a **Visit** link. Use it to open the app and test login.

- Later: push to `main` (or your connected branch) to trigger new deployments automatically.
- Logs and redeploys: **Project → Deployments** and **Logs**.

---

## Quick checklist

- [ ] Code pushed to GitHub
- [ ] Project imported in Vercel
- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in Vercel
- [ ] Supabase **Site URL** and **Redirect URLs** updated to your Vercel URL
- [ ] First deploy successful and app opens in browser
