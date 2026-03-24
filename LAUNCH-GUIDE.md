# ALCHEMY OS — Launch Guide

## You need 3 accounts (all free):

1. **Supabase** — supabase.com (database + file storage)
2. **GitHub** — github.com (code repository)
3. **Vercel** — vercel.com (hosting, sign up with GitHub)

---

## STEP 1: Set up Supabase (5 minutes)

1. Go to **supabase.com** → Sign up / Log in
2. Click **"New Project"**
3. Name it `alchemy-os`, set a database password (save it), pick the closest region to your clients
4. Wait ~2 min for it to provision
5. Once ready, go to **SQL Editor** (left sidebar)
6. Paste the ENTIRE contents of `supabase-schema.sql` → Click **Run**
7. You should see "Success" — your tables are created

### Get your keys:
- Go to **Settings → API** (left sidebar)
- Copy **Project URL** (looks like `https://xxxxx.supabase.co`)
- Copy **anon public key** (the long string)
- Save both somewhere — you'll need them in Step 3

---

## STEP 2: Set up GitHub repo (3 minutes)

1. Go to **github.com** → Sign up / Log in
2. Click the **+** button → **New repository**
3. Name it `alchemy-os`
4. Keep it **Public** or **Private** (your choice)
5. Click **Create repository**
6. You'll see instructions — keep this page open

### Upload the code:
**Option A — Drag and drop (easiest):**
- Download the `alchemy-os-app.jsx` file I gave you
- On the GitHub repo page, click **"uploading an existing file"**
- Drag the file in → Commit

**Option B — Terminal (if you're comfortable):**
```bash
git clone https://github.com/YOUR_USERNAME/alchemy-os.git
cd alchemy-os
# Copy all project files here
git add .
git commit -m "Initial launch"
git push origin main
```

---

## STEP 3: Deploy on Vercel (3 minutes)

1. Go to **vercel.com** → Sign up with GitHub
2. Click **"Add New Project"**
3. Import your `alchemy-os` repo from GitHub
4. Before deploying, add **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
   - `ANTHROPIC_API_KEY` = your Claude API key (get from console.anthropic.com)
5. Click **Deploy**
6. Wait ~60 seconds
7. You're live at `alchemy-os.vercel.app` (or custom domain)

---

## STEP 4: Custom domain (optional, 2 minutes)

1. In Vercel, go to your project → **Settings → Domains**
2. Add your domain (e.g., `app.alchemyos.co`)
3. Vercel will show you DNS records to add
4. Add them in your domain registrar (Namecheap, GoDaddy, etc.)
5. SSL is automatic

---

## STEP 5: Get your Claude API key

1. Go to **console.anthropic.com**
2. Sign up / Log in
3. Go to **API Keys** → Create new key
4. Copy it and add it to Vercel env vars as `ANTHROPIC_API_KEY`

---

## What each piece does:

| Service | Role | Cost |
|---------|------|------|
| Supabase | Database + file storage | Free (up to 500MB) |
| Vercel | Hosts your app | Free (hobby plan) |
| GitHub | Stores your code | Free |
| Claude API | Generates brand guidelines | ~$0.10-0.30 per client |

**Total cost to run: ~$0 until you scale past free tiers**

---

## After launch:

- Every time you update code → push to GitHub → Vercel auto-deploys
- Client data persists in Supabase
- Product images stored in Supabase Storage
- You can share the URL directly with clients

---

## Future upgrades (when ready):

- **Auth**: Add Supabase Auth for client login (magic link)
- **Email**: Add Resend for automated notifications
- **Image gen**: Connect Nano Banana 2 API for AI ad images
- **Custom domain**: Point alchemyos.com to Vercel
