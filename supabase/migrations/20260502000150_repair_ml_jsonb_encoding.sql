update public.calibration_models
set params_json = (params_json #>> '{}')::jsonb
where jsonb_typeof(params_json) = 'string';

update public.calibration_models
set metrics_json = (metrics_json #>> '{}')::jsonb
where jsonb_typeof(metrics_json) = 'string';

update public.calibration_models
set metrics_json =
  coalesce(((metrics_json -> 0) #>> '{}')::jsonb, '{}'::jsonb) ||
  coalesce(metrics_json -> 1, '{}'::jsonb)
where jsonb_typeof(metrics_json) = 'array';

update public.drift_signals
set metadata = (metadata #>> '{}')::jsonb
where jsonb_typeof(metadata) = 'string';

update public.ml_job_queue
set result_json = (result_json #>> '{}')::jsonb
where result_json is not null
  and jsonb_typeof(result_json) = 'string';
