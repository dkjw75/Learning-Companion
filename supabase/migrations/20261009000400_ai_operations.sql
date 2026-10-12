-- Stage 5 server-only quota counters and validated operation payloads.
create table app_private.ai_usage_days (
  day date not null,
  scope_key text not null,
  call_count integer not null default 0 check (call_count >= 0),
  primary key(day, scope_key)
);
create table app_private.operation_results (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null unique references app_private.operation_requests(id) on delete cascade,
  validated_payload jsonb not null,
  created_at timestamptz not null default now()
);
alter table app_private.ai_usage_days enable row level security;
alter table app_private.operation_results enable row level security;
revoke all on app_private.ai_usage_days, app_private.operation_results from public, anon, authenticated;
grant all on app_private.ai_usage_days, app_private.operation_results to service_role;
