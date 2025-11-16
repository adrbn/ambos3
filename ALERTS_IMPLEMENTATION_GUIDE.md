# 🚨 Guide d'Implémentation des Alertes AMBOS

## État Actuel

### ✅ Ce qui est fait:
- Tables SQL (alerts, alert_triggers, watch_schedules)
- Page UI de gestion (/alerts)
- Fonctions SQL (check_alert_conditions)
- Interface de création/modification

### ❌ Ce qui manque:
- Backend pour envoyer les notifications
- Cron job pour vérifier périodiquement
- Intégrations email/SMS/webhook

---

## 📋 Implémentation Complète (2-3 heures)

### Étape 1: Créer l'Edge Function de vérification

**Fichier:** `supabase/functions/check-alerts/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get all active alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select('*')
      .eq('is_active', true);

    if (alertsError) throw alertsError;

    console.log(`Checking ${alerts?.length || 0} active alerts`);

    // 2. For each alert, check if conditions are met
    for (const alert of alerts || []) {
      // Get recent articles (last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      // This is simplified - in production, fetch from your data sources
      let shouldTrigger = false;
      let triggerData: any = {};

      // Check alert type
      switch (alert.alert_type) {
        case 'keyword':
          // Check if keyword appears in recent articles
          const keyword = alert.trigger_conditions.keyword;
          // Query your articles/data feed
          shouldTrigger = false; // Implement logic here
          break;

        case 'volume':
          // Check if volume exceeds threshold
          const threshold = alert.trigger_conditions.threshold;
          // Count recent articles
          shouldTrigger = false; // Implement logic here
          break;

        // Add other alert types...
      }

      // 3. If triggered, send notification
      if (shouldTrigger) {
        await sendNotification(alert, triggerData, supabase);
      }
    }

    return new Response(
      JSON.stringify({ success: true, alertsChecked: alerts?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function sendNotification(alert: any, data: any, supabase: any) {
  const channels = alert.notification_channels || [];

  // Record trigger
  await supabase.from('alert_triggers').insert({
    alert_id: alert.id,
    trigger_data: data,
    notification_channels: channels,
  });

  // Send via each channel
  for (const channel of channels) {
    switch (channel) {
      case 'email':
        await sendEmail(alert, data);
        break;
      case 'webhook':
        await sendWebhook(alert, data);
        break;
      case 'sms':
        await sendSMS(alert, data);
        break;
      case 'in-app':
        // Already recorded in DB, will show in UI
        break;
    }
  }
}

async function sendEmail(alert: any, data: any) {
  // Use Resend, SendGrid, or similar
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set');
    return;
  }

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'AMBOS <alerts@ambos.dev>',
      to: alert.email_address,
      subject: `🚨 Alerte AMBOS: ${alert.name}`,
      html: `
        <h2>Alerte déclenchée: ${alert.name}</h2>
        <p>Type: ${alert.alert_type}</p>
        <p>Niveau: ${alert.alert_level}</p>
        <p>Détails: ${JSON.stringify(data, null, 2)}</p>
      `,
    }),
  });
}

async function sendWebhook(alert: any, data: any) {
  if (!alert.webhook_url) return;

  await fetch(alert.webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      alert_name: alert.name,
      alert_type: alert.alert_type,
      alert_level: alert.alert_level,
      trigger_data: data,
      timestamp: new Date().toISOString(),
    }),
  });
}

async function sendSMS(alert: any, data: any) {
  // Use Twilio or similar
  const TWILIO_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
  const TWILIO_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
  const TWILIO_PHONE = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!TWILIO_SID || !alert.phone_number) return;

  const auth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);

  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: alert.phone_number,
      From: TWILIO_PHONE,
      Body: `🚨 AMBOS Alert: ${alert.name} - ${alert.alert_level}`,
    }),
  });
}
```

---

### Étape 2: Déployer la fonction

```bash
cd supabase
npx supabase functions deploy check-alerts

# Set secrets
npx supabase secrets set RESEND_API_KEY=your-key
npx supabase secrets set TWILIO_ACCOUNT_SID=your-sid
npx supabase secrets set TWILIO_AUTH_TOKEN=your-token
npx supabase secrets set TWILIO_PHONE_NUMBER=+1234567890
```

---

### Étape 3: Configurer un Cron job

**Option A: Supabase Cron (pg_cron)**

```sql
-- Dans Supabase SQL Editor
SELECT cron.schedule(
  'check-ambos-alerts',
  '*/15 * * * *', -- Toutes les 15 minutes
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT.supabase.co/functions/v1/check-alerts',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb
    ) AS request_id;
  $$
);
```

**Option B: External Cron (Cron-job.org, EasyCron)**

1. Créer un compte sur https://cron-job.org
2. Ajouter job:
   - URL: `https://YOUR_PROJECT.supabase.co/functions/v1/check-alerts`
   - Method: POST
   - Headers: `Authorization: Bearer YOUR_SERVICE_KEY`
   - Interval: Toutes les 15 minutes

**Option C: GitHub Actions**

```yaml
# .github/workflows/check-alerts.yml
name: Check Alerts
on:
  schedule:
    - cron: '*/15 * * * *' # Every 15 minutes

jobs:
  check-alerts:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger alert check
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}" \
            -H "Content-Type: application/json" \
            https://YOUR_PROJECT.supabase.co/functions/v1/check-alerts
```

---

## 🎯 Configuration et Utilisation

### Créer une alerte:

1. **Via l'UI** (http://localhost:8080/alerts):
   - Cliquez "Nouvelle alerte"
   - Remplissez le formulaire
   - Choisissez les canaux de notification

2. **Via SQL** (pour tests):

```sql
INSERT INTO alerts (
  user_id,
  name,
  alert_type,
  alert_level,
  trigger_conditions,
  notification_channels,
  email_address
) VALUES (
  'YOUR_USER_ID',
  'Alerte Cyber-attaque',
  'keyword',
  'critical',
  '{"keyword": "cyber attack|ransomware|data breach"}'::jsonb,
  ARRAY['email', 'in-app'],
  'votre@email.com'
);
```

### Tester une alerte:

```sql
-- Déclencher manuellement
SELECT check_alert_conditions(
  'ALERT_ID'::uuid,
  '{"content": "Major cyber attack detected", "sentiment_score": -0.8}'::jsonb
);
```

---

## 📧 Services de Notification Recommandés

### Email:
- **Resend** (https://resend.com) - 100 emails/jour gratuit
- **SendGrid** - 100 emails/jour gratuit
- **Mailgun** - 5000 emails/mois gratuit

### SMS:
- **Twilio** - Pay as you go (~$0.01/SMS)
- **Vonage** (ex-Nexmo)

### Webhook:
- **Discord** webhook (gratuit)
- **Slack** webhook (gratuit)
- **Microsoft Teams** webhook (gratuit)

### Push Notifications:
- **OneSignal** (gratuit jusqu'à 10k utilisateurs)
- **Firebase Cloud Messaging** (gratuit)

---

## 🔧 Configuration Rapide (Discord Webhook - 5 minutes)

### 1. Créer un webhook Discord:
1. Serveur Discord → Paramètres → Intégrations → Webhooks
2. Créer un webhook → Copier l'URL

### 2. Modifier la page Alertes:

```typescript
// src/pages/Alerts.tsx - Add webhook field
<Input 
  placeholder="https://discord.com/api/webhooks/..." 
  value={webhookUrl}
  onChange={(e) => setWebhookUrl(e.target.value)}
/>
```

### 3. Tester:

```typescript
const testWebhook = async () => {
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: '🚨 **AMBOS Alert**',
      embeds: [{
        title: 'Cyber Attack Detected',
        description: 'Multiple sources reporting...',
        color: 0xFF0000,
        timestamp: new Date().toISOString()
      }]
    })
  });
};
```

---

## 🎯 Workflow Complet

```
1. Utilisateur crée alerte dans /alerts
   ↓
2. Alerte stockée dans DB (alerts table)
   ↓
3. Cron job exécute check-alerts toutes les 15 min
   ↓
4. Edge function vérifie les conditions
   ↓
5. Si condition remplie:
   - Enregistre dans alert_triggers
   - Envoie email/SMS/webhook
   - Notification in-app
   ↓
6. Utilisateur reçoit notification
   ↓
7. Utilisateur consulte /alerts pour historique
```

---

## 💡 Quick Start (Webhook Discord - MAINTENANT)

**Voulez-vous que je l'implémente pour Discord webhook ?**

Ça prend 10 minutes et vous aurez:
- ✅ Alertes fonctionnelles
- ✅ Notifications Discord en temps réel
- ✅ Webhook testable immédiatement

**Je le fais ?** 🚀

