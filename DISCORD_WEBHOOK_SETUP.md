# 🚨 Configuration Discord Webhook - 5 Minutes

## ✅ Ce qui a été créé:

1. **Edge Function `check-alerts`** - Vérifie et envoie les alertes
2. **Edge Function `test-alert`** - Teste une alerte manuellement
3. **Formulaire mis à jour** - Champs webhook + email dans /alerts

---

## 🚀 Setup Rapide (5 minutes)

### Étape 1: Créer un Webhook Discord

1. Ouvrez votre serveur Discord
2. Clic droit sur un canal → **Paramètres du salon**
3. **Intégrations** → **Webhooks**
4. **Nouveau Webhook**
5. Nommez-le "AMBOS Alerts"
6. **Copier l'URL du Webhook**
   ```
   https://discord.com/api/webhooks/1234567890/AbCdEfGhIjKlMnOpQrStUvWxYz...
   ```

---

### Étape 2: Déployer les Edge Functions

```bash
cd /Users/adrien/cursor_repos/ambos3/supabase

# Déployer les 2 fonctions
npx supabase functions deploy check-alerts
npx supabase functions deploy test-alert
```

---

### Étape 3: Créer une alerte avec webhook

1. Allez sur http://localhost:8080/alerts
2. Cliquez **"Nouvelle alerte"**
3. Remplissez:
   - **Nom**: "Test Discord"
   - **Type**: Keyword (ou autre)
   - **Niveau**: Critical
   - **Discord Webhook URL**: Collez votre URL Discord
4. **Créer l'alerte**

---

### Étape 4: Tester l'alerte

**Dans votre terminal:**

```bash
# Remplacez ALERT_ID par l'ID de votre alerte (visible dans Supabase)
curl -X POST \
  'https://vvzlzrhowdubpyxspdyi.supabase.co/functions/v1/test-alert' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{
    "alert_id": "YOUR_ALERT_ID",
    "test_message": "🧪 Test alerte depuis AMBOS !"
  }'
```

**OU directement depuis la console du navigateur (F12):**

```javascript
await fetch('https://vvzlzrhowdubpyxspdyi.supabase.co/functions/v1/test-alert', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Votre anon key
  },
  body: JSON.stringify({
    alert_id: 'ALERT_ID_FROM_SUPABASE',
    test_message: '🧪 Test depuis la console !'
  })
}).then(r => r.json()).then(console.log);
```

---

### Étape 5: Vérifier Discord

**Vous devriez voir dans votre canal Discord:**

```
🛡️ AMBOS Intelligence  [BOT]

🔴 Test Discord
Type: keyword
Niveau: CRITICAL

📊 Message
🧪 Test alerte depuis AMBOS !

⏰ Heure                🔢 Total déclenchements
16/11/2025 12:34        1

AMBOS - Advanced Multi-source OSINT System
```

---

## 🎯 Configuration Automatique (Optionnel)

Pour que les alertes se déclenchent **automatiquement** (pas juste manuellement):

### Option A: Cron-job.org (Gratuit, 5 min setup)

1. Créez compte: https://cron-job.org
2. **Create cronjob**:
   - **Title**: AMBOS Check Alerts
   - **URL**: `https://vvzlzrhowdubpyxspdyi.supabase.co/functions/v1/check-alerts`
   - **Schedule**: Every 15 minutes
   - **Request method**: POST
   - **Headers**:
     ```
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     Content-Type: application/json
     ```
   - **Body**:
     ```json
     {"test_mode": false}
     ```

### Option B: GitHub Actions (Gratuit)

Créez `.github/workflows/check-alerts.yml`:

```yaml
name: Check AMBOS Alerts
on:
  schedule:
    - cron: '*/15 * * * *' # Every 15 minutes

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Check alerts
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}" \
            -H "Content-Type: application/json" \
            https://vvzlzrhowdubpyxspdyi.supabase.co/functions/v1/check-alerts
```

---

## 📊 Workflow Complet

```
┌─────────────────────────────────────────────┐
│ 1. Créer alerte dans /alerts                │
│    - Nom, type, niveau                      │
│    - Webhook Discord                        │
│    - Conditions                             │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ 2. Alerte sauvegardée dans DB               │
│    Table: alerts                            │
│    is_active: true                          │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ 3. Cron exécute check-alerts (toutes 15min)│
│    OU test manuel avec test-alert          │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ 4. Fonction vérifie les conditions          │
│    - Keyword match                          │
│    - Volume threshold                       │
│    - Sentiment score                        │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ 5. Si déclenché:                            │
│    - Enregistre dans alert_triggers         │
│    - Envoie Discord webhook                 │
│    - Envoie email (si configuré)            │
│    - Update trigger_count                   │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ 6. Vous recevez notification Discord ! 🎉   │
│    - Temps réel                             │
│    - Formaté et coloré                      │
│    - Détails complets                       │
└─────────────────────────────────────────────┘
```

---

## 🧪 Test Immédiat (Dans 2 minutes)

**Voulez-vous que je vous aide à:**
1. Créer votre premier webhook Discord ?
2. Le tester immédiatement ?

**Il suffit de:**
1. Créer le webhook Discord (2 min)
2. Copier l'URL
3. Créer une alerte dans /alerts
4. La tester avec test-alert

**Et BOOM ! Notification Discord en temps réel ! 💥**

---

## 📱 Ce que vous voyez dans Discord:

Quand une alerte se déclenche:

```
🛡️ AMBOS Intelligence                    Aujourd'hui à 12:34

🔴 Alerte Cyber-attaque
Type: keyword
Niveau: CRITICAL

📊 Message
Détection de "ransomware" dans 15 articles récents

⏰ Heure: 16/11/2025 12:34    🔢 Total: 12
────────────────────────────────────────────
AMBOS - Advanced Multi-source OSINT System
```

---

**Prêt à configurer ? Dites-moi quand vous avez créé le webhook Discord ! 🚀**

