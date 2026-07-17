-- Hosted minimal entitlements recovery
-- Purpose: restore the hosted subscription surface with additive, idempotent SQL.
-- This is an operational recovery script, not a replacement for reconciling
-- migration history later.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'subscription_tier'
  ) then
    create type public.subscription_tier as enum (
      'free',
      'analyst',
      'pro',
      'enterprise',
      'academic',
      'elite'
    );
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'subscription_tier'
  ) and not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'subscription_tier'
      and e.enumlabel = 'elite'
  ) then
    alter type public.subscription_tier add value 'elite';
  end if;
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  tier public.subscription_tier not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'active'
    check (status in ('active', 'canceled', 'past_due', 'trialing', 'paused')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_subscriptions_status
  on public.user_subscriptions (status);

create table if not exists public.tier_limits (
  id uuid primary key default gen_random_uuid(),
  tier public.subscription_tier unique not null,
  display_name text not null,
  price_monthly_cents integer not null default 0,
  price_yearly_cents integer not null default 0,
  max_analyses_per_day integer not null default 5,
  max_matrix_size integer not null default 2,
  max_players integer not null default 2,
  max_scenarios_saved integer not null default 10,
  max_templates_access integer not null default 5,
  can_export_csv boolean not null default false,
  can_export_pdf boolean not null default false,
  can_use_api boolean not null default false,
  can_access_gold_module boolean not null default false,
  can_access_sequential_games boolean not null default false,
  can_access_monte_carlo boolean not null default false,
  can_access_real_time_data boolean not null default false,
  can_collaborate boolean not null default false,
  can_create_private_rooms boolean not null default false,
  can_white_label boolean not null default false,
  support_level text not null default 'community',
  created_at timestamptz not null default now(),
  can_access_labs boolean not null default false,
  can_access_forecasting boolean not null default false,
  can_access_intel boolean not null default false,
  monte_carlo_iterations integer not null default 100,
  has_signal_access boolean not null default false,
  has_marketplace_access boolean not null default false
);

create table if not exists public.usage_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  usage_type text not null,
  count integer not null default 0,
  period_start timestamptz not null default date_trunc('day', now()),
  period_end timestamptz not null default (date_trunc('day', now()) + interval '1 day'),
  created_at timestamptz not null default now(),
  unique(user_id, usage_type, period_start)
);

create index if not exists idx_usage_tracking_user_period
  on public.usage_tracking (user_id, period_start);

create table if not exists public.whop_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  whop_user_id text not null unique,
  whop_membership_id text,
  whop_email text,
  subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'pro', 'elite', 'enterprise', 'academic')),
  subscription_status text not null default 'active'
    check (subscription_status in ('active', 'past_due', 'canceled', 'trialing')),
  plan_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  payment_provider text not null default 'whop'
    check (payment_provider in ('whop', 'stripe')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_whop_users_user_id on public.whop_users(user_id);
create index if not exists idx_whop_users_whop_user_id on public.whop_users(whop_user_id);
create index if not exists idx_whop_users_email on public.whop_users(whop_email);

create table if not exists public.feature_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  feature_name text not null,
  usage_count integer not null default 0,
  period_start date not null default current_date,
  period_end date not null default ((current_date + interval '1 month')::date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, feature_name, period_start)
);

create index if not exists idx_feature_usage_user_period
  on public.feature_usage (user_id, period_start);

create or replace function public.get_user_tier(p_user_id uuid)
returns public.subscription_tier
language plpgsql
security definer
as $function$
declare
  v_tier public.subscription_tier;
begin
  select us.tier
    into v_tier
  from public.user_subscriptions us
  where us.user_id = p_user_id
    and us.status = 'active'
    and (us.current_period_end is null or us.current_period_end > now())
  order by coalesce(us.updated_at, us.created_at) desc, us.id desc
  limit 1;

  return coalesce(v_tier, 'free');
end;
$function$;

create or replace function public.check_tier_limit(
  p_user_id uuid,
  p_action text,
  p_increment int default 1
)
returns jsonb
language plpgsql
security definer
as $function$
declare
  v_tier public.subscription_tier;
  v_limits record;
  v_current_usage int := 0;
  v_max_allowed int := 0;
  v_allowed boolean := false;
begin
  v_tier := public.get_user_tier(p_user_id);
  select * into v_limits from public.tier_limits where tier = v_tier;

  if not found then
    return jsonb_build_object('allowed', false, 'tier', v_tier);
  end if;

  case p_action
    when 'analysis' then v_max_allowed := v_limits.max_analyses_per_day;
    when 'export_csv' then
      return jsonb_build_object('allowed', v_limits.can_export_csv, 'tier', v_tier);
    when 'export_pdf' then
      return jsonb_build_object('allowed', v_limits.can_export_pdf, 'tier', v_tier);
    when 'api_call' then
      return jsonb_build_object('allowed', v_limits.can_use_api, 'tier', v_tier);
    when 'gold_module' then
      return jsonb_build_object('allowed', v_limits.can_access_gold_module, 'tier', v_tier);
    when 'sequential_games' then
      return jsonb_build_object('allowed', v_limits.can_access_sequential_games, 'tier', v_tier);
    when 'monte_carlo' then
      return jsonb_build_object('allowed', v_limits.can_access_monte_carlo, 'tier', v_tier);
    when 'real_time_data' then
      return jsonb_build_object('allowed', v_limits.can_access_real_time_data, 'tier', v_tier);
    when 'labs' then
      return jsonb_build_object('allowed', v_limits.can_access_labs, 'tier', v_tier);
    when 'forecasting' then
      return jsonb_build_object('allowed', v_limits.can_access_forecasting, 'tier', v_tier);
    when 'intel' then
      return jsonb_build_object('allowed', v_limits.can_access_intel, 'tier', v_tier);
    else
      v_max_allowed := 0;
  end case;

  if v_max_allowed = -1 then
    return jsonb_build_object('allowed', true, 'tier', v_tier, 'unlimited', true);
  end if;

  select coalesce(count, 0)
    into v_current_usage
  from public.usage_tracking
  where user_id = p_user_id
    and usage_type = p_action
    and period_start = date_trunc('day', now());

  v_allowed := (v_current_usage + greatest(p_increment, 0)) <= v_max_allowed;

  if v_allowed and p_increment > 0 then
    insert into public.usage_tracking (user_id, usage_type, count, period_start, period_end)
    values (
      p_user_id,
      p_action,
      p_increment,
      date_trunc('day', now()),
      date_trunc('day', now()) + interval '1 day'
    )
    on conflict (user_id, usage_type, period_start)
    do update set count = public.usage_tracking.count + excluded.count;
  end if;

  return jsonb_build_object(
    'allowed', v_allowed,
    'tier', v_tier,
    'current_usage', v_current_usage,
    'max_allowed', v_max_allowed,
    'remaining', greatest(0, v_max_allowed - v_current_usage - greatest(p_increment, 0))
  );
end;
$function$;

create or replace function public.check_feature_usage(
  p_user_id uuid,
  p_feature text,
  p_increment integer default 1
)
returns json
language plpgsql
security definer
as $function$
declare
  v_tier text;
  v_limit integer := -1;
  v_current integer := 0;
  v_period_start date := date_trunc('month', current_date)::date;
begin
  select coalesce(
    (select wu.subscription_tier from public.whop_users wu where wu.user_id = p_user_id limit 1),
    (select us.tier::text from public.user_subscriptions us where us.user_id = p_user_id and us.status = 'active' limit 1),
    'free'
  )
  into v_tier;

  select case p_feature
    when 'daily_analyses' then max_analyses_per_day
    when 'monte_carlo' then monte_carlo_iterations
    else -1
  end
  into v_limit
  from public.tier_limits
  where tier::text = v_tier
  limit 1;

  if v_limit = -1 then
    return json_build_object('allowed', true, 'tier', v_tier, 'unlimited', true);
  end if;

  insert into public.feature_usage (user_id, feature_name, period_start, usage_count)
  values (p_user_id, p_feature, v_period_start, 0)
  on conflict (user_id, feature_name, period_start) do nothing;

  select usage_count
    into v_current
  from public.feature_usage
  where user_id = p_user_id
    and feature_name = p_feature
    and period_start = v_period_start;

  if coalesce(v_current, 0) + greatest(p_increment, 0) > v_limit then
    return json_build_object(
      'allowed', false,
      'tier', v_tier,
      'current_usage', coalesce(v_current, 0),
      'max_allowed', v_limit,
      'remaining', greatest(0, v_limit - coalesce(v_current, 0))
    );
  end if;

  if p_increment > 0 then
    update public.feature_usage
    set usage_count = usage_count + p_increment,
        updated_at = now()
    where user_id = p_user_id
      and feature_name = p_feature
      and period_start = v_period_start;
  end if;

  return json_build_object(
    'allowed', true,
    'tier', v_tier,
    'current_usage', coalesce(v_current, 0) + greatest(p_increment, 0),
    'max_allowed', v_limit,
    'remaining', greatest(0, v_limit - coalesce(v_current, 0) - greatest(p_increment, 0))
  );
end;
$function$;

alter table public.user_subscriptions enable row level security;
alter table public.tier_limits enable row level security;
alter table public.usage_tracking enable row level security;
alter table public.whop_users enable row level security;
alter table public.feature_usage enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_subscriptions' and policyname = 'read_own_subscription'
  ) then
    create policy read_own_subscription on public.user_subscriptions
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_subscriptions' and policyname = 'service_manage_subscriptions'
  ) then
    create policy service_manage_subscriptions on public.user_subscriptions
      for all using (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tier_limits' and policyname = 'read_tier_limits'
  ) then
    create policy read_tier_limits on public.tier_limits
      for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'usage_tracking' and policyname = 'read_own_usage'
  ) then
    create policy read_own_usage on public.usage_tracking
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'usage_tracking' and policyname = 'service_manage_usage'
  ) then
    create policy service_manage_usage on public.usage_tracking
      for all using (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'whop_users' and policyname = 'Users can view their own whop data'
  ) then
    create policy "Users can view their own whop data"
      on public.whop_users for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'whop_users' and policyname = 'Service role can manage whop data'
  ) then
    create policy "Service role can manage whop data"
      on public.whop_users for all
      using (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'feature_usage' and policyname = 'Users can view their own usage'
  ) then
    create policy "Users can view their own usage"
      on public.feature_usage for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'feature_usage' and policyname = 'System can manage usage'
  ) then
    create policy "System can manage usage"
      on public.feature_usage for all
      using (auth.role() = 'service_role');
  end if;
end
$$;

insert into public.tier_limits (
  tier,
  display_name,
  price_monthly_cents,
  price_yearly_cents,
  max_analyses_per_day,
  max_matrix_size,
  max_players,
  max_scenarios_saved,
  max_templates_access,
  can_export_csv,
  can_export_pdf,
  can_use_api,
  can_access_gold_module,
  can_access_sequential_games,
  can_access_monte_carlo,
  can_access_real_time_data,
  can_collaborate,
  can_create_private_rooms,
  can_white_label,
  support_level,
  can_access_labs,
  can_access_forecasting,
  can_access_intel,
  monte_carlo_iterations,
  has_signal_access,
  has_marketplace_access
)
values
  ('free', 'Free', 0, 0, 5, 2, 2, 10, 5, false, false, false, false, false, false, false, false, false, false, 'community', false, false, false, 100, false, false),
  ('pro', 'Pro', 1900, 19000, 50, 5, 5, 25, 50, true, true, false, false, true, true, false, false, false, false, 'email', true, false, false, 1000, false, true),
  ('elite', 'Elite', 4900, 49000, -1, 10, 10, 100, 100, true, true, true, true, true, true, true, true, true, false, 'priority', true, true, true, 10000, true, true),
  ('enterprise', 'Enterprise', 19900, 199000, -1, -1, -1, -1, -1, true, true, true, true, true, true, true, true, true, true, 'dedicated', true, true, true, 10000, true, true),
  ('academic', 'Academic', 3400, 34000, -1, 10, 10, 100, 100, true, true, false, true, true, true, true, true, true, false, 'priority', true, true, true, 10000, true, true)
on conflict (tier) do update
set
  display_name = excluded.display_name,
  price_monthly_cents = excluded.price_monthly_cents,
  price_yearly_cents = excluded.price_yearly_cents,
  max_analyses_per_day = excluded.max_analyses_per_day,
  max_matrix_size = excluded.max_matrix_size,
  max_players = excluded.max_players,
  max_scenarios_saved = excluded.max_scenarios_saved,
  max_templates_access = excluded.max_templates_access,
  can_export_csv = excluded.can_export_csv,
  can_export_pdf = excluded.can_export_pdf,
  can_use_api = excluded.can_use_api,
  can_access_gold_module = excluded.can_access_gold_module,
  can_access_sequential_games = excluded.can_access_sequential_games,
  can_access_monte_carlo = excluded.can_access_monte_carlo,
  can_access_real_time_data = excluded.can_access_real_time_data,
  can_collaborate = excluded.can_collaborate,
  can_create_private_rooms = excluded.can_create_private_rooms,
  can_white_label = excluded.can_white_label,
  support_level = excluded.support_level,
  can_access_labs = excluded.can_access_labs,
  can_access_forecasting = excluded.can_access_forecasting,
  can_access_intel = excluded.can_access_intel,
  monte_carlo_iterations = excluded.monte_carlo_iterations,
  has_signal_access = excluded.has_signal_access,
  has_marketplace_access = excluded.has_marketplace_access;

grant execute on function public.get_user_tier(uuid) to authenticated, service_role;
grant execute on function public.check_tier_limit(uuid, text, int) to authenticated, service_role;
grant execute on function public.check_feature_usage(uuid, text, integer) to authenticated, service_role;
grant select on public.tier_limits to authenticated, anon;
grant select on public.user_subscriptions to authenticated;
grant select on public.usage_tracking to authenticated;
