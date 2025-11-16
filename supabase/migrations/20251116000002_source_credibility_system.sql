-- ================================================
-- Data Quality: Source Credibility System
-- ================================================
-- Track and manage source reliability for better intelligence analysis

-- Source Credibility Table
CREATE TABLE IF NOT EXISTS source_credibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text UNIQUE NOT NULL,
  source_type text CHECK (source_type IN ('news', 'social_media', 'government', 'academic', 'osint', 'unknown')) DEFAULT 'unknown',
  credibility_score integer CHECK (credibility_score >= 0 AND credibility_score <= 100) DEFAULT 50,
  bias_rating text CHECK (bias_rating IN ('left', 'center-left', 'center', 'center-right', 'right', 'unknown')) DEFAULT 'unknown',
  fact_check_record jsonb DEFAULT '{"accurate": 0, "misleading": 0, "false": 0}'::jsonb,
  country text,
  language text,
  verification_status text CHECK (verification_status IN ('verified', 'unverified', 'flagged', 'banned')) DEFAULT 'unverified',
  notes text,
  verified_by uuid REFERENCES auth.users(id),
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_source_credibility_name ON source_credibility(source_name);
CREATE INDEX IF NOT EXISTS idx_source_credibility_score ON source_credibility(credibility_score DESC);
CREATE INDEX IF NOT EXISTS idx_source_credibility_type ON source_credibility(source_type);

-- Source Performance Tracking
CREATE TABLE IF NOT EXISTS source_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text REFERENCES source_credibility(source_name) ON DELETE CASCADE,
  date date DEFAULT CURRENT_DATE,
  articles_count integer DEFAULT 0,
  accuracy_rate decimal(5,2),
  timeliness_score integer CHECK (timeliness_score >= 0 AND timeliness_score <= 100),
  user_feedback_positive integer DEFAULT 0,
  user_feedback_negative integer DEFAULT 0,
  UNIQUE(source_name, date)
);

CREATE INDEX IF NOT EXISTS idx_source_performance_source_date ON source_performance(source_name, date DESC);

-- Disinformation Indicators
CREATE TABLE IF NOT EXISTS disinformation_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id text NOT NULL,
  indicator_type text CHECK (indicator_type IN (
    'sensationalism', 'propaganda', 'fake_news', 'manipulation', 
    'deepfake', 'out_of_context', 'satire', 'unverified'
  )),
  confidence_score decimal(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  detected_by text DEFAULT 'ai', -- 'ai', 'user', 'fact_checker'
  evidence jsonb,
  reviewer_id uuid REFERENCES auth.users(id),
  status text CHECK (status IN ('flagged', 'confirmed', 'disputed', 'resolved')) DEFAULT 'flagged',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disinformation_article ON disinformation_indicators(article_id);
CREATE INDEX IF NOT EXISTS idx_disinformation_status ON disinformation_indicators(status);

-- Function to get source credibility
CREATE OR REPLACE FUNCTION get_source_credibility(p_source_name text)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'source_name', source_name,
    'credibility_score', credibility_score,
    'bias_rating', bias_rating,
    'verification_status', verification_status,
    'source_type', source_type
  ) INTO v_result
  FROM source_credibility
  WHERE source_name = p_source_name;
  
  -- Return default if not found
  IF v_result IS NULL THEN
    v_result := jsonb_build_object(
      'source_name', p_source_name,
      'credibility_score', 50,
      'bias_rating', 'unknown',
      'verification_status', 'unverified',
      'source_type', 'unknown'
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update source credibility based on feedback
CREATE OR REPLACE FUNCTION update_source_credibility(
  p_source_name text,
  p_was_accurate boolean,
  p_user_id uuid
) RETURNS void AS $$
DECLARE
  v_current_score integer;
  v_adjustment integer;
BEGIN
  -- Get current score
  SELECT credibility_score INTO v_current_score
  FROM source_credibility
  WHERE source_name = p_source_name;
  
  -- Insert if doesn't exist
  IF NOT FOUND THEN
    INSERT INTO source_credibility (source_name, credibility_score)
    VALUES (p_source_name, 50);
    v_current_score := 50;
  END IF;
  
  -- Adjust score
  v_adjustment := CASE WHEN p_was_accurate THEN 2 ELSE -5 END;
  
  UPDATE source_credibility
  SET 
    credibility_score = GREATEST(0, LEAST(100, v_current_score + v_adjustment)),
    last_updated = now(),
    verified_by = p_user_id,
    fact_check_record = jsonb_set(
      fact_check_record,
      ARRAY[CASE WHEN p_was_accurate THEN 'accurate' ELSE 'false' END],
      to_jsonb(COALESCE((fact_check_record->>CASE WHEN p_was_accurate THEN 'accurate' ELSE 'false' END)::integer, 0) + 1)
    )
  WHERE source_name = p_source_name;
  
  -- Log audit event
  PERFORM log_audit_event(
    p_user_id,
    'source_credibility_updated',
    'source_credibility',
    p_source_name,
    jsonb_build_object('was_accurate', p_was_accurate, 'new_score', v_current_score + v_adjustment)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed with common news sources
INSERT INTO source_credibility (source_name, source_type, credibility_score, bias_rating, verification_status, country) VALUES
  ('Reuters', 'news', 95, 'center', 'verified', 'UK'),
  ('Associated Press', 'news', 95, 'center', 'verified', 'US'),
  ('AFP', 'news', 90, 'center', 'verified', 'France'),
  ('BBC', 'news', 85, 'center-left', 'verified', 'UK'),
  ('The Guardian', 'news', 80, 'center-left', 'verified', 'UK'),
  ('Le Monde', 'news', 85, 'center-left', 'verified', 'France'),
  ('Le Figaro', 'news', 80, 'center-right', 'verified', 'France'),
  ('CNN', 'news', 75, 'center-left', 'verified', 'US'),
  ('Fox News', 'news', 70, 'right', 'verified', 'US'),
  ('RT', 'news', 30, 'unknown', 'flagged', 'Russia'),
  ('Sputnik', 'news', 25, 'unknown', 'flagged', 'Russia'),
  ('TASS', 'news', 40, 'unknown', 'verified', 'Russia'),
  ('Xinhua', 'news', 45, 'unknown', 'verified', 'China'),
  ('Al Jazeera', 'news', 75, 'center', 'verified', 'Qatar'),
  ('Times of Israel', 'news', 75, 'center', 'verified', 'Israel'),
  ('Defense News', 'news', 85, 'center', 'verified', 'US'),
  ('Janes', 'news', 95, 'center', 'verified', 'UK'),
  ('Breaking Defense', 'news', 80, 'center', 'verified', 'US')
ON CONFLICT (source_name) DO NOTHING;

-- Enable RLS
ALTER TABLE source_credibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE disinformation_indicators ENABLE ROW LEVEL SECURITY;

-- Everyone can read source credibility
CREATE POLICY "Anyone can view source credibility"
  ON source_credibility FOR SELECT
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can modify source credibility"
  ON source_credibility FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Anyone can view source performance"
  ON source_performance FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view disinformation indicators"
  ON disinformation_indicators FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can flag disinformation"
  ON disinformation_indicators FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

COMMENT ON TABLE source_credibility IS 'Tracks credibility and bias of news sources';
COMMENT ON TABLE source_performance IS 'Daily performance metrics for sources';
COMMENT ON TABLE disinformation_indicators IS 'Flags potential disinformation and propaganda';

