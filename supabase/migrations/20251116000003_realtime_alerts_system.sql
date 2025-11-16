-- ================================================
-- Real-time Monitoring & Alerts System
-- ================================================
-- Automated monitoring with customizable alerts

-- Alerts Configuration Table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  watch_id uuid REFERENCES sector_watches(id) ON DELETE SET NULL,
  name text NOT NULL,
  alert_type text CHECK (alert_type IN ('keyword', 'entity', 'sentiment', 'threat', 'volume', 'anomaly')) NOT NULL,
  alert_level text CHECK (alert_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  trigger_conditions jsonb NOT NULL,
  notification_channels text[] DEFAULT ARRAY['in-app'],
  email_address text,
  webhook_url text,
  phone_number text,
  is_active boolean DEFAULT true,
  last_triggered timestamptz,
  trigger_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_watch_id ON alerts(watch_id);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(is_active) WHERE is_active = true;

-- Alert Triggers (history)
CREATE TABLE IF NOT EXISTS alert_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES alerts(id) ON DELETE CASCADE,
  trigger_data jsonb NOT NULL,
  notification_sent boolean DEFAULT false,
  notification_channels text[],
  error_message text,
  triggered_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_triggers_alert_id ON alert_triggers(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_triggers_triggered_at ON alert_triggers(triggered_at DESC);

-- Watch Schedules (for automated execution)
CREATE TABLE IF NOT EXISTS watch_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  watch_id uuid REFERENCES sector_watches(id) ON DELETE CASCADE,
  schedule_cron text NOT NULL, -- e.g., '0 */6 * * *' for every 6 hours
  timezone text DEFAULT 'UTC',
  is_active boolean DEFAULT true,
  last_run timestamptz,
  next_run timestamptz,
  run_count integer DEFAULT 0,
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_cron CHECK (schedule_cron ~ '^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*/[0-9]+|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])-([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])(,([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9]))+)\s+(\*|([0-9]|1[0-9]|2[0-3])|\*/[0-9]+|([0-9]|1[0-9]|2[0-3])-([0-9]|1[0-9]|2[0-3])|([0-9]|1[0-9]|2[0-3])(,([0-9]|1[0-9]|2[0-3]))+)\s+(\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*/[0-9]+|([1-9]|1[0-9]|2[0-9]|3[0-1])-([1-9]|1[0-9]|2[0-9]|3[0-1])|([1-9]|1[0-9]|2[0-9]|3[0-1])(,([1-9]|1[0-9]|2[0-9]|3[0-1]))+)\s+(\*|([1-9]|1[0-2])|\*/[0-9]+|([1-9]|1[0-2])-([1-9]|1[0-2])|([1-9]|1[0-2])(,([1-9]|1[0-2]))+)\s+(\*|([0-6])|\*/[0-9]+|([0-6])-([0-6])|([0-6])(,([0-6]))+)$')
);

CREATE INDEX IF NOT EXISTS idx_watch_schedules_watch_id ON watch_schedules(watch_id);
CREATE INDEX IF NOT EXISTS idx_watch_schedules_next_run ON watch_schedules(next_run) WHERE is_active = true;

-- Trending Topics Detection
CREATE TABLE IF NOT EXISTS trending_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  category text,
  mention_count integer DEFAULT 1,
  velocity decimal(10,2), -- Rate of increase
  sentiment_score decimal(5,2),
  related_entities text[],
  time_window timestamptz NOT NULL,
  detected_at timestamptz DEFAULT now(),
  UNIQUE(topic, time_window)
);

CREATE INDEX IF NOT EXISTS idx_trending_topics_time ON trending_topics(time_window DESC);
CREATE INDEX IF NOT EXISTS idx_trending_topics_velocity ON trending_topics(velocity DESC);

-- Function to check alert conditions
CREATE OR REPLACE FUNCTION check_alert_conditions(
  p_alert_id uuid,
  p_new_data jsonb
) RETURNS boolean AS $$
DECLARE
  v_alert record;
  v_conditions jsonb;
  v_should_trigger boolean := false;
BEGIN
  SELECT * INTO v_alert FROM alerts WHERE id = p_alert_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  v_conditions := v_alert.trigger_conditions;
  
  -- Check based on alert type
  CASE v_alert.alert_type
    WHEN 'keyword' THEN
      -- Check if keywords appear in data
      v_should_trigger := (p_new_data->>'content')::text ~* (v_conditions->>'keyword')::text;
      
    WHEN 'entity' THEN
      -- Check if specific entity is mentioned
      v_should_trigger := p_new_data->'entities' @> v_conditions->'entity';
      
    WHEN 'sentiment' THEN
      -- Check sentiment threshold
      v_should_trigger := (p_new_data->>'sentiment_score')::decimal < (v_conditions->>'threshold')::decimal;
      
    WHEN 'threat' THEN
      -- Check threat level
      v_should_trigger := (p_new_data->>'threat_level')::text = ANY((v_conditions->>'levels')::text[]);
      
    WHEN 'volume' THEN
      -- Check if volume exceeds threshold
      v_should_trigger := (p_new_data->>'article_count')::integer > (v_conditions->>'threshold')::integer;
      
    WHEN 'anomaly' THEN
      -- Check for anomalies (simplified)
      v_should_trigger := (p_new_data->>'anomaly_score')::decimal > (v_conditions->>'threshold')::decimal;
  END CASE;
  
  -- Record trigger if conditions met
  IF v_should_trigger THEN
    INSERT INTO alert_triggers (alert_id, trigger_data)
    VALUES (p_alert_id, p_new_data);
    
    UPDATE alerts
    SET last_triggered = now(), trigger_count = trigger_count + 1
    WHERE id = p_alert_id;
    
    -- Log audit event
    PERFORM log_audit_event(
      v_alert.user_id,
      'alert_triggered',
      'alerts',
      p_alert_id::text,
      jsonb_build_object('alert_type', v_alert.alert_type, 'alert_level', v_alert.alert_level)
    );
  END IF;
  
  RETURN v_should_trigger;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate next run time from cron expression (simplified)
CREATE OR REPLACE FUNCTION calculate_next_run(p_schedule_cron text, p_current_time timestamptz DEFAULT now())
RETURNS timestamptz AS $$
BEGIN
  -- Simplified: For hourly schedules (e.g., '0 */6 * * *')
  -- Full cron parsing would require more complex logic or external library
  IF p_schedule_cron LIKE '0 */% * * *' THEN
    -- Extract hours interval
    DECLARE
      v_hours integer;
    BEGIN
      v_hours := substring(p_schedule_cron from '\*/(\d+)')::integer;
      RETURN date_trunc('hour', p_current_time) + (v_hours || ' hours')::interval;
    END;
  END IF;
  
  -- Default: run every hour
  RETURN date_trunc('hour', p_current_time) + interval '1 hour';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update next run time
CREATE OR REPLACE FUNCTION update_watch_schedule_next_run()
RETURNS trigger AS $$
BEGIN
  NEW.next_run := calculate_next_run(NEW.schedule_cron, COALESCE(NEW.last_run, now()));
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER watch_schedule_update_next_run
  BEFORE INSERT OR UPDATE ON watch_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_watch_schedule_next_run();

-- Enable RLS
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;

-- Users can manage their own alerts
CREATE POLICY "Users can manage their own alerts"
  ON alerts FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their alert triggers"
  ON alert_triggers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM alerts
      WHERE alerts.id = alert_triggers.alert_id
      AND alerts.user_id = auth.uid()
    )
  );

-- Authenticated users can manage their watch schedules
-- Note: sector_watches is currently a public table without user_id
-- This policy allows any authenticated user to manage watch schedules
CREATE POLICY "Authenticated users can manage watch schedules"
  ON watch_schedules FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM sector_watches
      WHERE sector_watches.id = watch_schedules.watch_id
    )
  );

-- Everyone can view trending topics
CREATE POLICY "Anyone can view trending topics"
  ON trending_topics FOR SELECT
  USING (true);

COMMENT ON TABLE alerts IS 'Configurable alert rules for real-time monitoring';
COMMENT ON TABLE alert_triggers IS 'History of alert triggers';
COMMENT ON TABLE watch_schedules IS 'Automated scheduling for sector watches';
COMMENT ON TABLE trending_topics IS 'Automatically detected trending topics and events';

