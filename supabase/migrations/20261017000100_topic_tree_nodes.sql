-- Student-owned suggestions. Each request commits one complete trio.
create table public.topic_tree_nodes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  parent_key text not null check (length(parent_key) between 6 and 160),
  title text not null check (length(btrim(title)) between 3 and 100),
  normalized_title text generated always as (lower(regexp_replace(btrim(title), '\s+', ' ', 'g'))) stored,
  objective text not null check (length(btrim(objective)) between 10 and 240),
  request_id uuid not null,
  slot smallint not null check (slot between 1 and 3),
  created_at timestamptz not null default now(),
  unique (owner_id, normalized_title),
  unique (owner_id, request_id, slot)
);
create index topic_tree_nodes_parent on public.topic_tree_nodes(owner_id, parent_key, created_at);
alter table public.topic_tree_nodes enable row level security;
revoke all on public.topic_tree_nodes from public, anon, authenticated;
grant select on public.topic_tree_nodes to authenticated;
create policy topic_tree_nodes_own_read on public.topic_tree_nodes for select to authenticated
  using (owner_id = (select auth.uid()));
