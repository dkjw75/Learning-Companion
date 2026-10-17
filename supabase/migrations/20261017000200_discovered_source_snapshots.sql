-- Private, immutable snapshots of automatically checked web passages.
alter table public.topic_tree_nodes add constraint topic_tree_nodes_owner_id_id_unique unique (owner_id, id);

create table app_private.discovered_source_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  node_id uuid not null,
  canonical_url text not null,
  title text not null,
  content_hash text not null,
  extracted_text text not null check (length(extracted_text) between 1 and 100000),
  fetched_at timestamptz not null default now(),
  unique (owner_id, node_id, canonical_url),
  foreign key (owner_id, node_id) references public.topic_tree_nodes(owner_id, id) on delete cascade
);

create table app_private.discovered_source_chunks (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references app_private.discovered_source_snapshots(id) on delete cascade,
  heading text not null,
  ordinal integer not null check (ordinal >= 0),
  body text not null check (length(body) between 1 and 12000),
  unique (snapshot_id, ordinal)
);

create index discovered_source_snapshots_owner_node on app_private.discovered_source_snapshots(owner_id, node_id);
alter table app_private.discovered_source_snapshots enable row level security;
alter table app_private.discovered_source_chunks enable row level security;
revoke all on app_private.discovered_source_snapshots, app_private.discovered_source_chunks from public, anon, authenticated;
grant all on app_private.discovered_source_snapshots, app_private.discovered_source_chunks to service_role;
