alter table if exists public.strategic_patterns
add column if not exists signature_hash text;

update public.strategic_patterns
set signature_hash = coalesce(signature_hash, pattern_signature)
where signature_hash is null;
