-- =============================================
-- OPTIMIZATIONS FOR SIPLING APPLICATION
-- =============================================

-- 1. Add indexes for frequently queried columns
-- Reports table indexes
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_user_status ON reports(user_id, status);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- 2. Add limit to prevent large data transfers
-- This is handled in the frontend with pagination

-- 3. Optimize photo storage settings (if not already set)
-- Storage bucket policies are already optimized

-- 4. Add function to cleanup old activity logs (optional)
-- Uncomment to enable auto-cleanup of logs older than 90 days
/*
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM activity_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run weekly (via cron or external scheduler)
-- SELECT cleanup_old_logs();
*/

-- 5. Add composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports(status, created_at DESC);