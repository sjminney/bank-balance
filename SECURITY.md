# Security overview

This document summarizes how the app stays secure and what you should do to keep it that way.

## What’s already in place

### Authentication and authorization
- **Supabase Auth** handles sign-up, login, and sessions. Passwords are hashed by Supabase.
- **Middleware** protects `/dashboard` and `/settings`: unauthenticated users are redirected to `/login`. Authenticated users are redirected away from `/login` and `/signup`.
- **Server actions** (balances, income, bank accounts, delete-all) all call `supabase.auth.getUser()` and return an error if the user is not logged in. No action runs without a valid session.

### Data isolation (Row Level Security – RLS)
- **Supabase RLS** is enabled on all tables (`monthly_balances`, `bank_accounts`, `monthly_incomes`).
- Policies restrict SELECT, INSERT, UPDATE, and DELETE to rows where `user_id = auth.uid()`. Users can only see and change their own data.
- Even if the app had a bug, the database would still block access to other users’ data.

### Server-side checks
- **Balances**: Insert/update use the authenticated `user.id`. When a `bank_account_id` is provided, the app verifies that account belongs to the current user before linking.
- **Delete** operations (balance, income, bank account, delete-all) always filter by `user_id`, so users can only delete their own records.
- **Bank accounts**: Create uses `user.id`; update and delete filter by `user_id` and the record `id`.

### Input validation
- **Numeric fields** (balance, interest, one-off, income) are parsed and validated; invalid or negative values are rejected.
- **Dates** (month/year) are validated before use.
- **Bank accounts**: `account_type` and `currency` are validated against allowed lists (no arbitrary values stored).

### No sensitive logic or secrets in the client
- **Secrets** (Supabase anon key, URL) are only used as intended: the anon key is designed to be public and is safe when RLS is enabled. Real secrets (e.g. service role) are not used in the browser.
- **No `dangerouslySetInnerHTML`** or `eval`; React’s default escaping helps prevent XSS.

### Security headers (added)
- **X-Frame-Options: DENY** – reduces clickjacking risk.
- **X-Content-Type-Options: nosniff** – helps prevent MIME sniffing.
- **Referrer-Policy: strict-origin-when-cross-origin** – limits referrer data sent to other sites.
- **Permissions-Policy** – disables camera, microphone, and geolocation for this app.

### Env and repo
- **`.env` and `.env*.local`** are in `.gitignore`; do not commit real keys. Use `.env.local.example` as a template.

## What you should do

1. **Keep Supabase secure**
   - In the Supabase dashboard, ensure RLS stays enabled and policies are not relaxed.
   - Use a strong database password and restrict who has project access.
   - Prefer the anon key in the app; avoid using the service role key in the frontend or in places that could be exposed.

2. **Use HTTPS in production**
   - Vercel (and similar hosts) serve over HTTPS by default. Do not disable it.

3. **Set `NEXT_PUBLIC_SITE_URL` in production**
   - Set this to your real app URL (e.g. `https://your-app.vercel.app`) so auth redirects and emails use the correct domain.

4. **Optional: rate limiting**
   - For extra protection against abuse, add rate limiting (e.g. at the edge or in Supabase) on login and on sensitive actions. Not implemented in this codebase today.

5. **Dependencies**
   - Run `npm audit` periodically and fix high/critical issues. Upgrade Next.js and Supabase packages when security fixes are released.

## Summary

The app is built so that:
- Only logged-in users can reach dashboard and settings.
- Every server action checks the session and scopes data by `user_id`.
- The database enforces the same with RLS.
- Inputs are validated and security headers are set.

Following the steps above and keeping dependencies and Supabase settings up to date will help keep the project secure.
