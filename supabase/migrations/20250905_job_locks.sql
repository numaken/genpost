-- Job locks table for distributed job processing
CREATE TABLE IF NOT EXISTS job_locks (
    lock_key TEXT PRIMARY KEY,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    locked_by TEXT NOT NULL
);

-- Index for cleanup operations
CREATE INDEX IF NOT EXISTS idx_job_locks_expires_at ON job_locks(expires_at);

-- Function to automatically clean up expired locks
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM job_locks 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup every 10 minutes (requires pg_cron extension)
-- This is optional and may require admin setup
-- SELECT cron.schedule('cleanup-job-locks', '*/10 * * * *', 'SELECT cleanup_expired_locks();');