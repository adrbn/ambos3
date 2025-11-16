# ⚡ AMBOS Quick Start Guide

Get AMBOS running in under 30 minutes!

---

## 🎯 What You'll Need

1. **Accounts** (all free tiers available):
   - Supabase: https://supabase.com
   - OpenAI: https://platform.openai.com
   - NewsAPI: https://newsapi.org
   - GNews: https://gnews.io

2. **Tools**:
   - Node.js 22+ (https://nodejs.org)
   - Git
   - Code editor (VS Code recommended)

3. **Time**: ~30 minutes

---

## 🚀 5-Minute Local Setup

### Step 1: Get the Code
```bash
# Clone repository
git clone https://github.com/your-org/ambos.git
cd ambos

# Install dependencies
npm install
```

### Step 2: Configure Environment
```bash
# Copy template
cp .env.example .env.local

# Edit with your favorite editor
nano .env.local  # or code .env.local
```

**Minimum required variables:**
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-your-openai-key
NEWSAPI_KEY=your-newsapi-key
GNEWS_API_KEY=your-gnews-key
```

### Step 3: Run Migration
```bash
# Automated migration from Lovable
npm run migrate

# Follow prompts
```

### Step 4: Start Development
```bash
npm run dev
```

**Done!** Open http://localhost:8080

---

## 🗄️ 10-Minute Database Setup

### Step 1: Create Supabase Project
1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in:
   - Name: "AMBOS"
   - Database Password: [generate strong password]
   - Region: [closest to you]
4. Wait for project creation (~2 minutes)

### Step 2: Get Credentials
1. Go to Project Settings > API
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### Step 3: Run Migrations
```bash
cd supabase

# Login to Supabase CLI
npx supabase login

# Link project
npx supabase link --project-ref YOUR_PROJECT_REF
# Find YOUR_PROJECT_REF in your Supabase URL

# Push database schema
npx supabase db push

# Deploy Edge Functions
npx supabase functions deploy

# Set secrets
npx supabase secrets set OPENAI_API_KEY=sk-...
npx supabase secrets set NEWSAPI_KEY=...
npx supabase secrets set GNEWS_API_KEY=...
```

**Done!** Database ready.

---

## 🌐 15-Minute Production Deployment

### Option A: Vercel (Easiest)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

In Vercel dashboard:
1. Go to Settings > Environment Variables
2. Add all variables from `.env.local`
3. Redeploy

**Live!** Your site is now at `your-project.vercel.app`

### Option B: Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Initialize
netlify init

# Deploy
netlify deploy --prod
```

Add environment variables in Netlify dashboard.

**Live!** Your site is now at `your-project.netlify.app`

---

## 🔑 Getting API Keys

### OpenAI (Required)
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy key (starts with `sk-`)
4. Add $5-10 credit to start

**Cost**: ~$0.02-0.10 per search (depending on articles)

### NewsAPI (Required)
1. Go to https://newsapi.org/register
2. Sign up (free tier: 100 requests/day)
3. Copy API key from dashboard

**Free tier**: 100 searches/day

### GNews (Required)
1. Go to https://gnews.io/register
2. Sign up (free tier: 100 requests/day)
3. Copy API key

**Free tier**: 100 searches/day

### MediaStack (Optional)
1. Go to https://mediastack.com/product
2. Sign up (free tier: 500 requests/month)
3. Copy API key

**Free tier**: 500 searches/month

---

## 👤 Creating First Admin User

### Method 1: Supabase Dashboard

1. Go to Supabase Dashboard
2. Authentication > Users
3. Click "Add User"
4. Fill in email and password
5. Go to SQL Editor
6. Run:
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('YOUR_USER_ID', 'admin');
```

### Method 2: Sign Up + SQL

1. Open your deployed AMBOS
2. Click "Sign Up"
3. Create account
4. Get your user ID from Supabase Auth
5. Run SQL above

**Done!** You're now admin.

---

## ✅ Verify Everything Works

### Checklist
Run through this quick test:

1. [ ] Visit your deployed URL
2. [ ] Login with admin account
3. [ ] Perform a search (try "cyber security")
4. [ ] Verify results appear
5. [ ] Check AI analysis loaded
6. [ ] View map module
7. [ ] View network graph
8. [ ] Create a sector watch
9. [ ] Launch sector watch
10. [ ] Export HTML report
11. [ ] Save a layout
12. [ ] Load saved layout

**All working?** You're ready to go! 🎉

---

## 🆘 Common Issues

### "Build failed"
```bash
# Clear cache
rm -rf node_modules dist
npm install
npm run build
```

### "Supabase connection error"
- Check `VITE_SUPABASE_URL` is correct
- Verify `VITE_SUPABASE_ANON_KEY` is correct
- Ensure RLS policies are set up

### "OpenAI API error"
- Verify `OPENAI_API_KEY` is correct
- Check you have credits
- Try key in: https://platform.openai.com/playground

### "No search results"
- Check News API keys are correct
- Verify APIs have remaining quota
- Try different search terms

### "Edge function timeout"
- Increase timeout in `supabase/config.toml`
- Check function logs in Supabase dashboard
- Verify all secrets are set

---

## 📚 Next Steps

**For Users:**
- Read full [README.md](./README.md)
- Check out [User Guide](./docs/USER_GUIDE.md) (coming soon)
- Join community discussions

**For Developers:**
- Read [CONTRIBUTING.md](./CONTRIBUTING.md)
- Review [Architecture](./docs/ARCHITECTURE.md) (coming soon)
- Start building features!

**For Admins:**
- Set up monitoring (Sentry, UptimeRobot)
- Configure backups
- Review security settings
- Set up custom domain

---

## 💡 Pro Tips

1. **Use Cloudflare** for CDN and DDoS protection
2. **Enable caching** to save API costs
3. **Set up alerts** for downtime
4. **Regular backups** of Supabase database
5. **Monitor API usage** to avoid overages
6. **Use Git branches** for testing changes
7. **Keep .env.local secure** (never commit!)

---

## 🎓 Learning Resources

- **Supabase Docs**: https://supabase.com/docs
- **OpenAI Docs**: https://platform.openai.com/docs
- **React Docs**: https://react.dev
- **TypeScript Docs**: https://www.typescriptlang.org/docs

---

## 📞 Need Help?

- **GitHub Issues**: https://github.com/your-org/ambos/issues
- **Discord**: [Join our server] (coming soon)
- **Email**: support@ambos.dev

---

**Ready to dive deeper?**

- 📖 [Full Documentation](./README.md)
- 🚀 [Deployment Guide](./DEPLOYMENT.md)
- ✅ [Migration Checklist](./MIGRATION_CHECKLIST.md)
- 🤝 [Contributing](./CONTRIBUTING.md)

---

*Happy Intelligence Gathering! 🛡️*
