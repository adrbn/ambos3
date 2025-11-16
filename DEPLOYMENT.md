# 🚀 AMBOS Deployment Guide

This guide will help you deploy AMBOS independently from Lovable.dev to production.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Migration from Lovable](#migration-from-lovable)
- [Deployment Options](#deployment-options)
- [Post-Deployment](#post-deployment)
- [Domain Setup](#domain-setup)
- [Monitoring](#monitoring)

---

## Prerequisites

### Required Accounts & Services

1. **Supabase Account** (Database & Auth)
   - Sign up at https://supabase.com
   - Create a new project
   - Note: You can self-host Supabase if needed

2. **AI Provider** (Choose one or more)
   - OpenAI: https://platform.openai.com
   - Anthropic: https://console.anthropic.com
   - Google AI: https://makersuite.google.com

3. **News API Keys**
   - NewsAPI: https://newsapi.org
   - GNews: https://gnews.io
   - MediaStack: https://mediastack.com

4. **Hosting** (Choose one)
   - Vercel (easiest)
   - Netlify
   - AWS (most control)
   - Digital Ocean
   - Your own VPS

5. **Domain**
   - Register ambos.dev (or transfer if owned)
   - DNS provider (Cloudflare recommended)

---

## Migration from Lovable

### Step 1: Export Current Data

```bash
# 1. Export Supabase data from Lovable
# Go to Lovable's Supabase instance and export:
# - sector_watches table
# - saved_layouts table
# - user_roles table
# - profiles table

# 2. Save all environment variables from Lovable
# Copy all API keys and configurations
```

### Step 2: Set Up Your Own Supabase

```bash
# 1. Create new Supabase project
# Visit https://app.supabase.com

# 2. Run migrations
cd supabase
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push

# 3. Import your data
# Use Supabase dashboard to import the exported tables
```

### Step 3: Update Environment Variables

```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local with your values
nano .env.local

# Required variables:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
# - OPENAI_API_KEY (or other AI provider)
# - NEWSAPI_KEY, GNEWS_API_KEY, MEDIASTACK_KEY
```

### Step 4: Replace Lovable AI Gateway

The current code uses Lovable's AI gateway. We need to replace it.

**File to modify:** `supabase/functions/analyze-news/index.ts`

```typescript
// REMOVE THIS:
const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  // ...
});

// REPLACE WITH THIS:
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4-turbo-preview', // or 'gpt-4', 'gpt-3.5-turbo'
    messages: [
      { role: 'system', content: systemPrompts[language as keyof typeof systemPrompts] || systemPrompts.en },
      { role: 'user', content: /* ... */ }
    ],
    temperature: 0.7,
  }),
});
```

---

## Deployment Options

### Option 1: Vercel (Recommended - Easiest)

**Pros:** Dead simple, automatic SSL, CDN, serverless functions
**Cons:** Limited customization, serverless limitations

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel

# 4. Set environment variables in Vercel dashboard
# Go to: https://vercel.com/your-username/ambos/settings/environment-variables

# 5. Set up custom domain
# In Vercel dashboard: Settings > Domains > Add ambos.dev
```

**vercel.json** configuration:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ]
}
```

---

### Option 2: Netlify

**Pros:** Easy, generous free tier, good DX
**Cons:** Similar to Vercel

```bash
# 1. Install Netlify CLI
npm i -g netlify-cli

# 2. Login
netlify login

# 3. Initialize
netlify init

# 4. Deploy
netlify deploy --prod

# 5. Set environment variables
netlify env:set VITE_SUPABASE_URL "your-url"
# Repeat for all variables
```

**netlify.toml** (already exists, verify):
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

### Option 3: Docker + VPS (Most Control)

**Pros:** Full control, any provider, scalable
**Cons:** More setup, you manage everything

```bash
# 1. Build Docker image
docker build -t ambos:latest .

# 2. Test locally
docker run -p 3000:80 ambos:latest

# 3. Push to registry
docker tag ambos:latest your-registry/ambos:latest
docker push your-registry/ambos:latest

# 4. Deploy to server (example with SSH)
ssh your-server
docker pull your-registry/ambos:latest
docker stop ambos || true
docker rm ambos || true
docker run -d \
  --name ambos \
  --restart unless-stopped \
  -p 80:80 \
  -p 443:443 \
  your-registry/ambos:latest
```

---

### Option 4: AWS (Enterprise Grade)

**Pros:** Maximum scalability, all AWS services
**Cons:** Complex, more expensive

#### Using AWS Amplify (Simplest AWS option)
```bash
# 1. Install AWS Amplify CLI
npm install -g @aws-amplify/cli

# 2. Configure
amplify init
amplify add hosting

# 3. Deploy
amplify publish
```

#### Using AWS ECS/Fargate (Container-based)
```bash
# 1. Push to ECR
aws ecr create-repository --repository-name ambos
aws ecr get-login-password | docker login --username AWS --password-stdin your-ecr-url
docker tag ambos:latest your-ecr-url/ambos:latest
docker push your-ecr-url/ambos:latest

# 2. Create ECS cluster and service (use AWS Console or terraform)
# 3. Set up Application Load Balancer
# 4. Configure Route53 for ambos.dev
```

---

### Option 5: Kubernetes (Maximum Scalability)

Create these files:

**k8s/deployment.yml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ambos
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ambos
  template:
    metadata:
      labels:
        app: ambos
    spec:
      containers:
      - name: ambos
        image: your-registry/ambos:latest
        ports:
        - containerPort: 80
        env:
        - name: VITE_SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: ambos-secrets
              key: supabase-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

**k8s/service.yml**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: ambos-service
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 80
  selector:
    app: ambos
```

Deploy:
```bash
kubectl apply -f k8s/
```

---

## Post-Deployment

### 1. Database Setup

```bash
# Run Supabase migrations
cd supabase
npx supabase db push

# Create admin user
# Via Supabase dashboard > Authentication > Add user
# Then in SQL Editor:
INSERT INTO user_roles (user_id, role) 
VALUES ('your-user-id', 'admin');
```

### 2. Edge Functions Deployment

```bash
# Deploy Supabase functions to your Supabase instance
cd supabase
npx supabase functions deploy analyze-news
npx supabase functions deploy fetch-news
npx supabase functions deploy extract-entities
npx supabase functions deploy extract-locations
# ... deploy all functions
```

### 3. Set Edge Function Secrets

```bash
# Set API keys for edge functions
npx supabase secrets set OPENAI_API_KEY=your-key
npx supabase secrets set NEWSAPI_KEY=your-key
npx supabase secrets set GNEWS_API_KEY=your-key
# ... set all secrets
```

---

## Domain Setup (ambos.dev)

### Step 1: DNS Configuration

1. **Add A records** (if using IP):
```
Type  Name  Value           TTL
A     @     your-server-ip  300
A     www   your-server-ip  300
```

2. **Or CNAME** (if using hosting platform):
```
Type   Name  Value                TTL
CNAME  @     your-host.vercel.app 300
CNAME  www   your-host.vercel.app 300
```

### Step 2: SSL Certificate

**If using Vercel/Netlify:** Automatic SSL ✅

**If using your own server:**
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d ambos.dev -d www.ambos.dev

# Auto-renewal (certbot sets this up automatically)
sudo certbot renew --dry-run
```

### Step 3: Cloudflare (Recommended)

1. Add ambos.dev to Cloudflare
2. Update nameservers at registrar
3. Enable:
   - SSL/TLS: Full (strict)
   - Always Use HTTPS: On
   - Automatic HTTPS Rewrites: On
   - WAF (Web Application Firewall): On
   - DDoS Protection: Enabled by default

---

## Monitoring

### 1. Set up Error Tracking (Sentry)

```bash
# Install Sentry
npm install @sentry/react @sentry/vite-plugin

# Configure in main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
});
```

### 2. Set up Analytics (PostHog or Plausible)

```bash
# Install PostHog
npm install posthog-js

# Configure in main.tsx
import posthog from 'posthog-js';

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: 'https://app.posthog.com',
});
```

### 3. Uptime Monitoring

- **UptimeRobot** (free): https://uptimerobot.com
- **Pingdom** (paid): https://www.pingdom.com
- Set up alerts for downtime

### 4. Application Monitoring

- **New Relic** or **Datadog** for production
- Set up dashboards for:
  - Response times
  - Error rates
  - API usage
  - User activity

---

## Security Checklist

- [ ] All environment variables secured
- [ ] SSL certificate installed
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Supabase RLS policies active
- [ ] Security headers in place
- [ ] Regular backups configured
- [ ] Vulnerability scanning enabled
- [ ] Authentication tested
- [ ] Admin access restricted

---

## Performance Optimization

```bash
# 1. Enable caching headers (already in nginx.conf)
# 2. Use CDN (Cloudflare or AWS CloudFront)
# 3. Enable compression (gzip/brotli)
# 4. Optimize images
# 5. Implement lazy loading
# 6. Use Redis for caching (if using Docker)
```

---

## Backup Strategy

### Automated Backups

```bash
# Supabase: Enable daily automated backups in dashboard
# Settings > Database > Backups

# Additional manual backup script
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backups/ambos_$DATE.sql
aws s3 cp backups/ambos_$DATE.sql s3://your-backup-bucket/
```

---

## Cost Estimation

### Vercel/Netlify Route (Recommended to start)
- Hosting: $0-20/month (free tier sufficient initially)
- Supabase: $25/month (Pro plan)
- OpenAI API: ~$50-200/month (depends on usage)
- News APIs: ~$50/month
- **Total: ~$125-300/month**

### AWS/Self-hosted Route
- EC2/ECS: $30-100/month
- RDS/Database: $50-150/month
- Load Balancer: $20/month
- CloudFront CDN: $10-50/month
- AI APIs: ~$50-200/month
- News APIs: ~$50/month
- **Total: ~$200-600/month**

---

## Troubleshooting

### Common Issues

1. **Build fails**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules dist
   npm install
   npm run build
   ```

2. **Supabase connection fails**
   ```bash
   # Check URL and keys
   curl https://your-project.supabase.co/rest/v1/
   ```

3. **Edge functions timeout**
   ```bash
   # Increase timeout in supabase/config.toml
   [functions]
   timeout = 60
   ```

---

## Next Steps

1. [ ] Complete migration checklist
2. [ ] Deploy to staging
3. [ ] Test all features
4. [ ] Deploy to production
5. [ ] Set up monitoring
6. [ ] Configure backups
7. [ ] Document custom processes
8. [ ] Train your team

---

## Support

For issues or questions:
- Documentation: https://docs.ambos.dev (to be created)
- GitHub Issues: https://github.com/your-org/ambos/issues
- Email: support@ambos.dev

---

## License & Commercial Use

See [LICENSING.md](./LICENSING.md) for commercial licensing options.
