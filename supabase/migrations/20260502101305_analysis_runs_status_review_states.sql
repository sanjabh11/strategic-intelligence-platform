alter table public.analysis_runs
  drop constraint if exists analysis_runs_status_check;

alter table public.analysis_runs
  add constraint analysis_runs_status_check
  check (
    status = any (
      array[
        'processing'::text,
        'completed'::text,
        'failed'::text,
        'needs_review'::text,
        'under_review'::text,
        'approved'::text,
        'rejected'::text
      ]
    )
  );
