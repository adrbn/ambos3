-- ================================================
-- Security Enhancement: Audit Logging System
-- ================================================
-- This migration adds comprehensive audit logging for security events

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource text NOT NULL,
  resource_id text,
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  success boolean DEFAULT true,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);

-- Rate Limiting Table
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  request_count integer DEFAULT 0,
  window_start timestamptz DEFAULT now(),
  last_request timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint ON rate_limits(user_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_max_requests integer DEFAULT 100,
  p_window_minutes integer DEFAULT 60
) RETURNS boolean AS $$
DECLARE
  v_count integer;
  v_window_start timestamptz;
BEGIN
  -- Get current window data
  SELECT request_count, window_start INTO v_count, v_window_start
  FROM rate_limits
  WHERE user_id = p_user_id AND endpoint = p_endpoint;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO rate_limits (user_id, endpoint, request_count, window_start)
    VALUES (p_user_id, p_endpoint, 1, now());
    RETURN true;
  END IF;
  
  -- If window expired, reset
  IF now() - v_window_start > (p_window_minutes || ' minutes')::interval THEN
    UPDATE rate_limits
    SET request_count = 1, window_start = now(), last_request = now()
    WHERE user_id = p_user_id AND endpoint = p_endpoint;
    RETURN true;
  END IF;
  
  -- Check if limit exceeded
  IF v_count >= p_max_requests THEN
    -- Log rate limit exceeded
    INSERT INTO audit_logs (user_id, action, resource, success, error_message)
    VALUES (p_user_id, 'rate_limit_exceeded', p_endpoint, false, 'Rate limit exceeded');
    RETURN false;
  END IF;
  
  -- Increment counter
  UPDATE rate_limits
  SET request_count = request_count + 1, last_request = now()
  WHERE user_id = p_user_id AND endpoint = p_endpoint;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id uuid,
  p_action text,
  p_resource text,
  p_resource_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}',
  p_success boolean DEFAULT true,
  p_error_message text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO audit_logs (
    user_id, action, resource, resource_id, 
    metadata, success, error_message
  )
  VALUES (
    p_user_id, p_action, p_resource, p_resource_id,
    p_metadata, p_success, p_error_message
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on audit logs (read-only for users, full access for admins)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs"
  ON audit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- No INSERT/UPDATE/DELETE for regular users (only through functions)
CREATE POLICY "Only system can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (false);

-- RLS on rate limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rate limits"
  ON rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- Cleanup old audit logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days integer DEFAULT 90)
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < now() - (retention_days || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup (run daily)
-- Note: This requires pg_cron extension, enable if available
-- SELECT cron.schedule('cleanup-audit-logs', '0 2 * * *', 'SELECT cleanup_old_audit_logs(90)');

COMMENT ON TABLE audit_logs IS 'Comprehensive audit log for all security-relevant events';
COMMENT ON TABLE rate_limits IS 'Rate limiting to prevent abuse and DoS attacks';
COMMENT ON FUNCTION check_rate_limit IS 'Check if user has exceeded rate limit for endpoint';
COMMENT ON FUNCTION log_audit_event IS 'Log security audit event';

