-- =====================================================
-- Migration: 20260730053339 upgrade (leaderboard schema fix)
-- Run this AFTER the original 20260730053339_add-triggers-and-helpers.sql.
-- =====================================================

-- =====================================================
-- 1. Fix leaderboard: refresh_leaderboard unique conflict target
--    Use (user_id, period, period_start) instead of (user_id, period)
-- =====================================================
BEGIN;

-- Drop the old unique constraint on (user_id, period)
ALTER TABLE public.leaderboard
  DROP CONSTRAINT IF EXISTS leaderboard_user_id_period_key;

-- Add period_start column if it doesn't exist
ALTER TABLE public.leaderboard
  ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ;

-- Backfill period_start from existing rows
-- 'all_time' entries start at epoch; weekly starts on Monday of that week;
-- daily starts on the date itself.
UPDATE public.leaderboard
   SET period_start = CASE
                        WHEN period = 'all_time' THEN '1970-01-01'::timestamptz
                        WHEN period = 'weekly'   THEN DATE_TRUNC('week', updated_at)
                        ELSE                       DATE_TRUNC('day',  updated_at)
                      END
 WHERE period_start IS NULL;

-- Create composite unique target required by refresh_leaderboard
ALTER TABLE public.leaderboard
  ADD CONSTRAINT leaderboard_user_id_period_period_start_key
    UNIQUE (user_id, period, period_start);

-- Ensure indexes cover the new target columns
CREATE INDEX IF NOT EXISTS idx_leaderboard_user_id
  ON public.leaderboard (user_id);

CREATE INDEX IF NOT EXISTS idx_leaderboard_period_score
  ON public.leaderboard (period, score DESC);

CREATE INDEX IF NOT EXISTS idx_leaderboard_period_period_start_score
  ON public.leaderboard (period, period_start, score DESC);

COMMIT;

-- =====================================================
-- 2. Fixed refresh_leaderboard function:
--    - Upsert against (user_id, period, period_start)
--    - Weekly: period_start = Monday of the current week
--    - Daily:  period_start = today
--    - Others: period_start = epoch
-- =====================================================
CREATE OR REPLACE FUNCTION public.refresh_leaderboard(p_period text DEFAULT 'all_time')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_period_start timestamptz;
BEGIN
  v_period_start := CASE
    WHEN p_period = 'weekly' THEN DATE_TRUNC('week', NOW())
    WHEN p_period = 'daily'  THEN DATE_TRUNC('day',  NOW())
    ELSE                          '1970-01-01'::timestamptz
  END;

  WITH ranked AS (
    SELECT
      user_id,
      p_period       AS period,
      v_period_start AS period_start,
      total_score    AS score,
      ROW_NUMBER() OVER (ORDER BY total_score DESC, created_at ASC) AS new_rank
    FROM public.profiles
    WHERE total_score > 0
  )
  INSERT INTO public.leaderboard (user_id, period, period_start, score, rank, updated_at)
  SELECT user_id, period, period_start, score, new_rank, NOW()
  FROM ranked
  ON CONFLICT (user_id, period, period_start) DO UPDATE
    SET score     = EXCLUDED.score,
        rank      = EXCLUDED.rank,
        updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_leaderboard(text) TO authenticated;

-- =====================================================
-- 3. Keep existing award_xp / check_achievements / ensure_profile
--    edge-function calls working. These call public.award_xp() and
--    public.check_achievements() which internally call refresh_leaderboard
--    — now with the corrected unique target.
-- =====================================================

-- =====================================================
-- 4. Additional performance indexes (idempotent)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_total_score ON public.profiles(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_xp          ON public.profiles(xp DESC);
