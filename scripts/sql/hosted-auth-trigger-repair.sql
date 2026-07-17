-- Hosted auth trigger repair
-- Purpose: harden the out-of-band auth.users -> public.handle_new_user() path so
-- signup cannot hang indefinitely on profile writes.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_full_name text := coalesce(new.raw_user_meta_data ->> 'full_name', 'User');
begin
  -- Keep auth writes moving even if profile writes are contended.
  perform set_config('lock_timeout', '2s', true);

  begin
    insert into public.profiles (user_id, email, full_name, role)
    values (new.id, new.email, v_full_name, 'federal_analyst')
    on conflict (user_id) do update
      set email = excluded.email,
          full_name = coalesce(excluded.full_name, public.profiles.full_name);
  exception
    when lock_not_available then
      raise warning 'handle_new_user skipped profile sync after lock timeout for user %', new.id;
    when unique_violation then
      null;
    when undefined_table or undefined_column then
      raise warning 'handle_new_user skipped profile sync because profiles schema is incomplete: %', sqlerrm;
    when others then
      raise warning 'handle_new_user skipped profile sync for user %: %', new.id, sqlerrm;
  end;

  return new;
end;
$function$;
