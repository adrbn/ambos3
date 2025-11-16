# 🚀 AMBOS Migration Checklist

Complete step-by-step checklist for migrating from Lovable.dev to independent deployment.

---

## 📋 Pre-Migration

### Data Backup
- [ ] Export all Supabase tables from Lovable:
  - [ ] `profiles`
  - [ ] `user_roles`
  - [ ] `sector_watches`
  - [ ] `saved_layouts`
  - [ ] `module_config`
- [ ] Save all environment variables from Lovable
- [ ] Document custom configurations
- [ ] Screenshot current working state

### Account Setup
- [ ] Create Supabase account (https://supabase.com)
- [ ] Create new Supabase project
- [ ] Note project URL and keys
- [ ] Create OpenAI account (or alternative AI provider)
- [ ] Get OpenAI API key
- [ ] Sign up for News APIs:
  - [ ] NewsAPI (https://newsapi.org)
  - [ ] GNews (https://gnews.io)
  - [ ] MediaStack (https://mediastack.com)
- [ ] Choose hosting provider (Vercel/Netlify/AWS/etc)

---

## 🔧 Local Setup

### Repository Setup
- [ ] Clone/fork repository
- [ ] Navigate to project directory
- [ ] Run `npm install`
- [ ] Create `.env.local` from `.env.example`
- [ ] Fill in all environment variables

### Environment Configuration
```bash
# Essential variables to configure:
- [ ] VITE_SUPABASE_URL
- [ ] VITE_SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] OPENAI_API_KEY (or alternative)
- [ ] NEWSAPI_KEY
- [ ] GNEWS_API_KEY
- [ ] MEDIASTACK_KEY
```

### Code Migration
- [ ] Run migration script: `npm run migrate`
- [ ] OR manually replace AI provider: `npm run replace-ai openai`
- [ ] Verify no references to Lovable remain
- [ ] Test build: `npm run build`
- [ ] Test locally: `npm run dev`

---

## 🗄️ Database Migration

### Supabase Setup
```bash
cd supabase
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

- [ ] Link to your Supabase project
- [ ] Run migrations: `npx supabase db push`
- [ ] Verify tables created in Supabase dashboard
- [ ] Enable Row Level Security (RLS):
  - [ ] Check each table has RLS policies
  - [ ] Test with non-admin user

### Data Import
- [ ] Import `profiles` table
- [ ] Import `user_roles` table
- [ ] Import `sector_watches` table
- [ ] Import `saved_layouts` table
- [ ] Import `module_config` table (if exists)
- [ ] Verify data integrity

### Edge Functions
- [ ] Deploy all functions: `npx supabase functions deploy`
- [ ] Set secrets: `npx supabase secrets set OPENAI_API_KEY=your-key`
- [ ] Set all API keys as secrets:
  ```bash
  npx supabase secrets set NEWSAPI_KEY=your-key
  npx supabase secrets set GNEWS_API_KEY=your-key
  npx supabase secrets set MEDIASTACK_KEY=your-key
  ```
- [ ] Test each function:
  - [ ] `analyze-news`
  - [ ] `fetch-news`
  - [ ] `extract-entities`
  - [ ] `extract-locations`
  - [ ] `enrich-query`

---

## 🧪 Testing

### Local Testing
- [ ] Authentication works (login/logout)
- [ ] Search returns results
- [ ] AI analysis completes
- [ ] Map displays markers
- [ ] Network graph renders
- [ ] Timeline shows events
- [ ] Sector watches can be created
- [ ] Sector watches can be launched
- [ ] Reports export (HTML/PDF)
- [ ] Settings save
- [ ] Layouts save/load
- [ ] All modules display correctly
- [ ] No console errors

### Multi-User Testing
- [ ] Create test users
- [ ] Assign different roles (admin, user)
- [ ] Test permissions
- [ ] Verify RLS working

### Performance Testing
- [ ] Search with 100+ articles
- [ ] Map with 50+ markers
- [ ] Network graph with many entities
- [ ] Dashboard with all modules

---

## 🚀 Deployment

### Choose Deployment Method
- [ ] Vercel (Recommended)
- [ ] Netlify
- [ ] Docker + VPS
- [ ] AWS
- [ ] Other: _____________

### Vercel Deployment
```bash
# Install CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

- [ ] Deploy to Vercel
- [ ] Set environment variables in dashboard
- [ ] Verify deployment works
- [ ] Test all features in production

### Netlify Deployment
```bash
# Install CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

- [ ] Deploy to Netlify
- [ ] Set environment variables
- [ ] Verify deployment works

### Docker Deployment
```bash
# Build
docker build -t ambos:latest .

# Test locally
docker run -p 3000:80 ambos:latest

# Push to registry
docker tag ambos:latest your-registry/ambos:latest
docker push your-registry/ambos:latest

# Deploy to server
# (depends on your infrastructure)
```

- [ ] Build Docker image
- [ ] Test locally
- [ ] Push to registry
- [ ] Deploy to server
- [ ] Verify deployment

---

## 🌐 Domain Setup

### DNS Configuration
- [ ] Purchase/transfer ambos.dev
- [ ] Point DNS to hosting provider
- [ ] Add A/CNAME records
- [ ] Wait for propagation (24-48h)

### SSL Certificate
- [ ] Enable SSL (automatic with Vercel/Netlify)
- [ ] OR install Let's Encrypt certificate
- [ ] Force HTTPS redirect
- [ ] Verify SSL working

### CDN (Optional but Recommended)
- [ ] Sign up for Cloudflare
- [ ] Add ambos.dev to Cloudflare
- [ ] Update nameservers
- [ ] Enable:
  - [ ] SSL/TLS (Full Strict)
  - [ ] Always Use HTTPS
  - [ ] WAF
  - [ ] Caching
  - [ ] DDoS Protection

---

## 🔐 Security Hardening

### Application Security
- [ ] All secrets in environment variables
- [ ] No hardcoded API keys
- [ ] CORS properly configured
- [ ] Security headers enabled
- [ ] Input validation in place
- [ ] XSS protection enabled

### Database Security
- [ ] RLS enabled on all tables
- [ ] Proper policies configured
- [ ] Admin access restricted
- [ ] Audit logging enabled (optional)

### Authentication
- [ ] Password requirements enforced
- [ ] Session timeout configured
- [ ] 2FA available for admins
- [ ] Password reset flow tested

---

## 📊 Monitoring Setup

### Error Tracking
- [ ] Sign up for Sentry (or alternative)
- [ ] Add Sentry to application
- [ ] Test error reporting
- [ ] Set up alerts

### Uptime Monitoring
- [ ] Sign up for UptimeRobot/Pingdom
- [ ] Add ambos.dev monitoring
- [ ] Configure alerts (email/SMS)
- [ ] Set check interval (5 min)

### Analytics (Optional)
- [ ] Add PostHog/Plausible
- [ ] Verify tracking works
- [ ] Set up key events
- [ ] Create dashboards

### Application Monitoring
- [ ] Configure Supabase metrics
- [ ] Monitor Edge Function logs
- [ ] Set up performance alerts
- [ ] Create status dashboard

---

## 🔄 Post-Deployment

### Final Verification
- [ ] Visit https://ambos.dev
- [ ] Complete full user journey:
  1. [ ] Login
  2. [ ] Perform search
  3. [ ] View all modules
  4. [ ] Create sector watch
  5. [ ] Launch sector watch
  6. [ ] Export report
  7. [ ] Save layout
  8. [ ] Load layout
  9. [ ] Logout
- [ ] Test on mobile devices
- [ ] Test in different browsers
- [ ] Verify all external links
- [ ] Check console for errors

### User Migration
- [ ] Notify existing users of new URL
- [ ] Provide login instructions
- [ ] Offer migration support
- [ ] Set up redirect from Lovable (if possible)

### Documentation
- [ ] Update README with new info
- [ ] Document deployment process
- [ ] Create user guide
- [ ] Write admin documentation
- [ ] Create troubleshooting guide

---

## 🎉 Success Criteria

All of these should be true:
- [ ] Application accessible at ambos.dev
- [ ] SSL certificate valid
- [ ] All features working
- [ ] No Lovable dependencies
- [ ] Database migrated successfully
- [ ] Users can login
- [ ] Searches return results
- [ ] AI analysis works
- [ ] Monitoring in place
- [ ] Backups configured
- [ ] Performance acceptable
- [ ] No critical errors

---

## 🆘 Rollback Plan

If something goes wrong:

### Immediate Actions
1. [ ] Keep Lovable version running
2. [ ] Document specific issue
3. [ ] Check error logs
4. [ ] Review recent changes

### Communication
- [ ] Notify users of issue
- [ ] Provide ETA for fix
- [ ] Offer alternative (Lovable version)

### Resolution
- [ ] Fix identified issue
- [ ] Test thoroughly
- [ ] Re-deploy
- [ ] Verify fix
- [ ] Notify users

---

## 📞 Support Contacts

- **Hosting Issues**: Your hosting provider support
- **Supabase Issues**: https://supabase.com/support
- **OpenAI Issues**: https://help.openai.com
- **AMBOS Issues**: support@ambos.dev

---

## 📅 Timeline Estimate

**Minimum Time**: 1-2 days (with experience)
**Realistic Time**: 3-5 days (thorough testing)
**Complex Deployments**: 1-2 weeks (custom infrastructure)

### Breakdown
- Setup & Configuration: 2-4 hours
- Database Migration: 2-3 hours
- Code Changes: 1-2 hours
- Testing: 4-6 hours
- Deployment: 2-4 hours
- DNS/Domain: 1-2 hours (+ propagation time)
- Monitoring: 2-3 hours
- Documentation: 2-4 hours

---

## ✅ Final Checklist

Before declaring migration complete:

- [ ] All items above checked
- [ ] Production URL working
- [ ] All users migrated
- [ ] Old instance can be shut down
- [ ] Monitoring alerts active
- [ ] Backups running
- [ ] Documentation complete
- [ ] Team trained
- [ ] Support plan in place

---

**🎊 Congratulations! AMBOS is now independent!**

Next steps: See [README.md](./README.md) for ongoing development and [CONTRIBUTING.md](./CONTRIBUTING.md) for how to improve AMBOS further.

---

*Questions? Email: migration-support@ambos.dev*
