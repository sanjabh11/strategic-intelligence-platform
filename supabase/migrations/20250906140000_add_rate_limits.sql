-- Migration: Add rate limit tracking for LLM/Perplexity API calls
-- Implements P3 rate limit and quota handling

CREATE TABLE IF NOT EXISTS public.rate_limit_tracking (
  id serial PRIMARY KEY,
  service_name text NOT NULL, -- 'perplexity', 'gemini', 'openai', etc.
  user_id text, -- NULL for global limits, or per-user
  request_count int DEFAULT 0,
  window_start timestamptz DEFAULT now(),
  window_end timestamptz DEFAULT now() + INTERVAL '1 hour',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_service_user ON public.rate_limit_tracking (service_name, user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_window ON public.rate_limit_tracking (window_end);

-- RLS policies
ALTER TABLE public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_rate_limit_tracking ON public.rate_limit_tracking FOR SELECT USING (true);

-- Function to check and increment rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
  service_name_param text,
  user_id_param text DEFAULT NULL,
  max_requests int DEFAULT 100,
  window_minutes int DEFAULT 60
) RETURNS boolean AS $$
DECLARE
  current_record record;
  new_count int;
  window_start timestamptz;
BEGIN
  -- Get current window
  window_start := date_trunc('minute', now()) - ((extract(minute from now()) % window_minutes) * interval '1 minute');

  -- Get or create rate limit record
  SELECT * INTO current_record
  FROM public.rate_limit_tracking
  WHERE service_name = service_name_param
    AND (user_id_param IS NULL OR user_id = user_id_param)
    AND window_start <= now()
    AND window_end > now()
  LIMIT 1;

  IF current_record.id IS NULL THEN
    -- Create new record
    INSERT INTO public.rate_limit_tracking (service_name, user_id, request_count, window_start, window_end)
    VALUES (service_name_param, user_id_param, 1, window_start, window_start + (window_minutes || ' minutes')::interval);
    RETURN true;
  END IF;

  -- Check if limit exceeded
  new_count := current_record.request_count + 1;
  IF new_count > max_requests THEN
    RETURN false;
  END IF;

  -- Update count
  UPDATE public.rate_limit_tracking
  SET request_count = new_count, updated_at = now()
  WHERE id = current_record.id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;