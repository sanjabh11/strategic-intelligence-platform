alter table if exists public.strategic_patterns
add column if not exists signature_hash text;

create or replace function public.sync_strategic_patterns_signatures()
returns trigger
language plpgsql
as $$
begin
  if new.signature_hash is null then
    new.signature_hash := new.pattern_signature;
  end if;
  if new.pattern_signature is null then
    new.pattern_signature := new.signature_hash;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_strategic_patterns_signatures on public.strategic_patterns;

create trigger trg_sync_strategic_patterns_signatures
before insert or update on public.strategic_patterns
for each row execute function public.sync_strategic_patterns_signatures();

update public.strategic_patterns
set signature_hash = coalesce(signature_hash, pattern_signature),
    pattern_signature = coalesce(pattern_signature, signature_hash)
where signature_hash is null or pattern_signature is null;
