create or replace function public.guard_identity_calibration_models()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fallback_row public.calibration_models%rowtype;
begin
  if new.active is true and new.method = 'identity' then
    select *
      into fallback_row
    from public.calibration_models
    where segment_key = new.segment_key
      and method in ('isotonic_regression', 'bayesian_smoothed_isotonic')
    order by
      case when active then 1 else 0 end desc,
      created_at desc
    limit 1;

    if fallback_row.id is null then
      raise exception 'Identity calibration insert blocked for %, no fallback model available', new.segment_key;
    end if;

    new.method := fallback_row.method;
    new.params_json := fallback_row.params_json;
    new.metrics_json := coalesce(fallback_row.metrics_json, '{}'::jsonb) || jsonb_build_object(
      'guarded_identity_blocked',
      true,
      'guarded_at',
      now()
    );
    new.minimum_sample_size := coalesce(fallback_row.minimum_sample_size, new.minimum_sample_size);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_identity_calibration_models on public.calibration_models;

create trigger trg_guard_identity_calibration_models
before insert or update on public.calibration_models
for each row
execute function public.guard_identity_calibration_models();
