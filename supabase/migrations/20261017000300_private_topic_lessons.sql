-- A checked student topic can have its own saved lesson and concept identity.
alter table public.concepts drop constraint catalogue_or_private;
alter table public.concepts add constraint catalogue_or_private check (
  (supported and owner_id is null and catalogue_order is not null and area <> 'other') or
  (not supported and owner_id is not null and catalogue_order is null
    and (not content_available or area = 'other'))
);

alter table public.lesson_sessions add column topic_node_id uuid;
alter table public.lesson_sessions add constraint lesson_sessions_topic_identity
  check (topic_node_id is null or topic_node_id = concept_id);
alter table public.lesson_sessions add constraint lesson_sessions_owned_topic
  foreign key (owner_id, topic_node_id) references public.topic_tree_nodes(owner_id, id);
create unique index lesson_sessions_one_per_topic on public.lesson_sessions(owner_id, topic_node_id)
  where topic_node_id is not null;
