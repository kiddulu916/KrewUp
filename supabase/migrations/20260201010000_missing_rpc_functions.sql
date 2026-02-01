-- Create missing RPC functions called by the codebase but not defined in migrations

-- 1. Update job coordinates (similar to update_user_coords)
-- Used by: features/jobs/actions/job-actions.ts
CREATE OR REPLACE FUNCTION "public"."update_job_coords"(
    "p_job_id" "uuid",
    "p_lat" double precision,
    "p_lng" double precision
) RETURNS void LANGUAGE "plpgsql" SECURITY DEFINER AS $$
BEGIN
  UPDATE jobs
  SET
    coords = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$;

-- 2. Get pending certifications trend for admin analytics
-- Used by: features/admin/actions/analytics-actions.ts
-- Returns daily count of pending certifications for the last N days
CREATE OR REPLACE FUNCTION "public"."get_pending_certifications_trend"(
    "p_days" integer DEFAULT 7
) RETURNS TABLE(
    "day" date,
    "pending_count" bigint
) LANGUAGE "plpgsql" STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) as day,
    COUNT(*) as pending_count
  FROM certifications
  WHERE
    verification_status = 'pending'
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE(created_at)
  ORDER BY day DESC;
END;
$$;

-- 3. Get pending content reports trend for admin analytics
-- Used by: features/admin/actions/analytics-actions.ts
-- Returns daily count of pending reports for the last N days
CREATE OR REPLACE FUNCTION "public"."get_pending_reports_trend"(
    "p_days" integer DEFAULT 7
) RETURNS TABLE(
    "day" date,
    "pending_count" bigint
) LANGUAGE "plpgsql" STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) as day,
    COUNT(*) as pending_count
  FROM content_reports
  WHERE
    status = 'pending'
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE(created_at)
  ORDER BY day DESC;
END;
$$;
