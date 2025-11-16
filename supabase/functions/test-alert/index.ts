import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Test Alert Function
 * Allows manual testing of alerts without waiting for real triggers
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { alert_id, test_message } = await req.json();

    if (!alert_id) {
      throw new Error('alert_id required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get alert
    const { data: alert, error: alertError } = await supabase
      .from('alerts')
      .select('*')
      .eq('id', alert_id)
      .single();

    if (alertError || !alert) {
      throw new Error('Alert not found');
    }

    console.log(`🧪 Testing alert: ${alert.name}`);

    const testData = {
      test: true,
      message: test_message || 'Test alert triggered manually',
      timestamp: new Date().toISOString(),
      alert_type: alert.alert_type,
      alert_level: alert.alert_level,
    };

    // Send via webhook if configured
    if (alert.webhook_url && alert.notification_channels?.includes('webhook')) {
      await sendDiscordWebhook(alert, testData);
    }

    // Record in database
    await supabase.from('alert_triggers').insert({
      alert_id: alert.id,
      trigger_data: testData,
      notification_sent: true,
      notification_channels: alert.notification_channels,
    });

    // Update stats
    await supabase
      .from('alerts')
      .update({
        last_triggered: new Date().toISOString(),
        trigger_count: (alert.trigger_count || 0) + 1,
      })
      .eq('id', alert.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test alert sent successfully',
        alert_name: alert.name 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error testing alert:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function sendDiscordWebhook(alert: any, data: any) {
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 0xFF0000;
      case 'high': return 0xFF6B00;
      case 'medium': return 0xFFFF00;
      case 'low': return 0x00FF00;
      default: return 0x00D9FF;
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
          name: '📊 Message',
          value: data.message || 'Alerte déclenchée',
          inline: false
        },
        {
          name: '⏰ Heure',
          value: new Date().toLocaleString('fr-FR'),
          inline: true
        },
        {
          name: '🔢 Total déclenchements',
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

