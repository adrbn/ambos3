-- ================================================
-- Performance Optimization: Database Indexes
-- ================================================
-- Add indexes for frequently queried columns to improve performance

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- Sector watches indexes
-- Note: sector_watches currently doesn't have user_id, is_active, or last_run columns
-- These indexes will be useful when the table is extended in the future
-- CREATE INDEX IF NOT EXISTS idx_sector_watches_user_created ON sector_watches(user_id, created_at DESC);
-- CREATE INDEX IF NOT EXISTS idx_sector_watches_active ON sector_watches(is_active) WHERE is_active = true;
-- CREATE INDEX IF NOT EXISTS idx_sector_watches_last_run ON sector_watches(last_run DESC NULLS LAST);

-- Current sector_watches indexes (based on existing schema)
CREATE INDEX IF NOT EXISTS idx_sector_watches_created_at ON sector_watches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sector_watches_sector ON sector_watches(sector);
CREATE INDEX IF NOT EXISTS idx_sector_watches_language ON sector_watches(language);

-- Saved layouts indexes
CREATE INDEX IF NOT EXISTS idx_saved_layouts_user_created ON saved_layouts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_layouts_is_default ON saved_layouts(user_id, is_default) WHERE is_default = true;

-- Module config indexes (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'module_config') THEN
    CREATE INDEX IF NOT EXISTS idx_module_config_user ON module_config(user_id);
  END IF;
END $$;

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON user_roles(user_id, role);

-- Add GIN indexes for JSONB columns (for faster JSON queries)
-- Note: sector_watches currently only has TEXT columns (query, not queries as JSONB)
-- Future migrations may add JSONB columns for more complex query structures
-- These indexes are commented out for now:
-- CREATE INDEX IF NOT EXISTS idx_sector_watches_queries_gin ON sector_watches USING gin(queries jsonb_path_ops);
-- CREATE INDEX IF NOT EXISTS idx_sector_watches_results_gin ON sector_watches USING gin(results jsonb_path_ops) WHERE results IS NOT NULL;

-- Saved layouts JSON search
CREATE INDEX IF NOT EXISTS idx_saved_layouts_config_gin ON saved_layouts USING gin(layout_config jsonb_path_ops);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_sector_watches_sector_language 
  ON sector_watches(sector, language);

-- Partial indexes for specific conditions
CREATE INDEX IF NOT EXISTS idx_sector_watches_recent 
  ON sector_watches(created_at DESC) 
  WHERE created_at > (now() - interval '30 days');

-- Full-text search indexes (if needed)
-- Add tsvector column for full-text search on sector watches
ALTER TABLE sector_watches 
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_sector_watches_search 
  ON sector_watches USING gin(search_vector);

-- Function to update statistics for query optimization
CREATE OR REPLACE FUNCTION refresh_statistics()
RETURNS void AS $$
BEGIN
  ANALYZE profiles;
  ANALYZE user_roles;
  ANALYZE sector_watches;
  ANALYZE saved_layouts;
  ANALYZE audit_logs;
  ANALYZE source_credibility;
  ANALYZE alerts;
  ANALYZE alert_triggers;
  ANALYZE watch_schedules;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON INDEX idx_sector_watches_search IS 'Full-text search on sector watches name and description';
COMMENT ON FUNCTION refresh_statistics IS 'Refresh table statistics for query optimizer';

-- Vacuum analyze all tables to ensure stats are up to date
VACUUM ANALYZE profiles;
VACUUM ANALYZE user_roles;
VACUUM ANALYZE sector_watches;
VACUUM ANALYZE saved_layouts;

-- Schedule periodic vacuuming and statistics refresh
-- Note: Requires pg_cron extension
-- SELECT cron.schedule('refresh-statistics', '0 3 * * 0', 'SELECT refresh_statistics()');

