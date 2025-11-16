import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

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

    console.log('🔍 Checking alerts...');

    // Get all active alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select('*')
      .eq('is_active', true);

    if (alertsError) {
      console.error('Error fetching alerts:', alertsError);
      throw alertsError;
    }

    console.log(`Found ${alerts?.length || 0} active alerts`);

    let triggeredCount = 0;

    // Check each alert
    for (const alert of alerts || []) {
      console.log(`Checking alert: ${alert.name} (${alert.alert_type})`);

      // Simplified check - in production, query real data sources
      // For now, we'll just trigger on manual test or specific keywords in recent data
      
      let shouldTrigger = false;
      let triggerData: any = {};

      // You can trigger alerts manually by calling this function with test data
      const { test_mode, test_data } = await req.json().catch(() => ({ test_mode: false }));

      if (test_mode) {
        shouldTrigger = true;
        triggerData = test_data || { message: 'Test alert triggered' };
      }

      if (shouldTrigger) {
        console.log(`⚡ Triggering alert: ${alert.name}`);
        triggeredCount++;

        // Record trigger in database
        const { error: insertError } = await supabase
          .from('alert_triggers')
          .insert({
            alert_id: alert.id,
            trigger_data: triggerData,
            notification_channels: alert.notification_channels,
            notification_sent: false,
          });

        if (insertError) {
          console.error('Error recording trigger:', insertError);
        }

        // Update alert stats
        await supabase
          .from('alerts')
          .update({
            last_triggered: new Date().toISOString(),
            trigger_count: (alert.trigger_count || 0) + 1,
          })
          .eq('id', alert.id);

        // Send notifications
        await sendNotifications(alert, triggerData);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        alertsChecked: alerts?.length || 0,
        triggered: triggeredCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-alerts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function sendNotifications(alert: any, data: any) {
  const channels = alert.notification_channels || [];

  for (const channel of channels) {
    try {
      switch (channel) {
        case 'webhook':
          if (alert.webhook_url) {
            await sendDiscordWebhook(alert, data);
          }
          break;
        case 'email':
          if (alert.email_address) {
            await sendEmail(alert, data);
          }
          break;
        case 'in-app':
          // Already recorded in database
          console.log('In-app notification recorded');
          break;
        default:
          console.log(`Channel ${channel} not implemented yet`);
      }
    } catch (error) {
      console.error(`Error sending ${channel} notification:`, error);
    }
  }
}

async function sendDiscordWebhook(alert: any, data: any) {
  if (!alert.webhook_url) return;

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 0xFF0000; // Red
      case 'high': return 0xFF6B00; // Orange
      case 'medium': return 0xFFFF00; // Yellow
      case 'low': return 0x00FF00; // Green
      default: return 0x00D9FF; // Cyan
    }
  };

  const getLevelEmoji = (level: string) => {
    switch (level) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '🔵';
    }
  };

  const payload = {
    username: 'AMBOS Intelligence',
    avatar_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=AMBOS&backgroundColor=00D9FF',
    embeds: [{
      title: `${getLevelEmoji(alert.alert_level)} ${alert.name}`,
      description: `**Type:** ${alert.alert_type}\n**Niveau:** ${alert.alert_level.toUpperCase()}`,
      color: getLevelColor(alert.alert_level),
      fields: [
        {
          name: '📊 Données',
          value: JSON.stringify(data, null, 2).substring(0, 1000),
          inline: false
        },
        {
          name: '⏰ Heure',
          value: new Date().toLocaleString('fr-FR'),
          inline: true
        },
        {
          name: '🔢 Déclenchements',
          value: `${(alert.trigger_count || 0) + 1}`,
          inline: true
        }
      ],
      footer: {
        text: 'AMBOS - Advanced Multi-source OSINT System'
      },
      timestamp: new Date().toISOString()
    }]
  };

  const response = await fetch(alert.webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook failed: ${response.statusText}`);
  }

  console.log(`✅ Discord notification sent for: ${alert.name}`);
}

async function sendEmail(alert: any, data: any) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  
  if (!RESEND_API_KEY) {
    console.log('⚠️ RESEND_API_KEY not configured, skipping email');
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'AMBOS Alerts <alerts@ambos.dev>',
      to: alert.email_address,
      subject: `🚨 Alerte AMBOS: ${alert.name} [${alert.alert_level.toUpperCase()}]`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #2c3e50; color: white; padding: 20px; text-align: center;">
            <h1>🛡️ AMBOS Intelligence Alert</h1>
          </div>
          <div style="padding: 20px; background: #f5f5f5;">
            <h2 style="color: #2c3e50;">${alert.name}</h2>
            <p><strong>Type:</strong> ${alert.alert_type}</p>
            <p><strong>Niveau:</strong> <span style="color: ${alert.alert_level === 'critical' ? 'red' : alert.alert_level === 'high' ? 'orange' : 'green'}">${alert.alert_level.toUpperCase()}</span></p>
            <p><strong>Déclenchée:</strong> ${new Date().toLocaleString('fr-FR')}</p>
            <div style="background: white; padding: 15px; border-left: 4px solid #00D9FF; margin: 20px 0;">
              <h3>Données:</h3>
              <pre style="font-size: 12px; overflow-x: auto;">${JSON.stringify(data, null, 2)}</pre>
            </div>
          </div>
          <div style="background: #2c3e50; color: white; padding: 10px; text-align: center; font-size: 12px;">
            AMBOS - Advanced Multi-source Biosecurity OSINT System
          </div>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    throw new Error(`Email failed: ${response.statusText}`);
  }

  console.log(`✅ Email sent to: ${alert.email_address}`);
}

