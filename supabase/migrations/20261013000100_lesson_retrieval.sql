-- Stage 6: rank approved reference chunks. Session and round snapshots remain
-- per learner and are written transactionally by the server, outside the bank.
alter table public.source_chunks
  add column search_document tsvector generated always as
    (setweight(to_tsvector('english', coalesce(heading, '')), 'A') ||
     setweight(to_tsvector('english', coalesce(body, '')), 'B')) stored;
create index source_chunks_search_idx on public.source_chunks using gin (search_document);
create index chunk_concepts_objective_idx on public.chunk_concepts(concept_id, objective_id, chunk_id);
create index source_revisions_approved_idx on public.source_revisions(source_id, id) where review_state='approved';
create index sources_approved_active_idx on public.sources(id, active_revision_id)
  where status='approved' and permission_review='allowed';

-- The server must provide the already verified learner's concept and objective
-- selection. Only active, approved revisions may contribute to retrieval.
create function public.find_approved_lesson_passages(p_concept_id uuid, p_objective_ids text[], p_query text)
returns table(id uuid, heading text, body text, source_url text, objective_id text, rank real)
language sql stable security invoker set search_path = '' as $$
  select ch.id, ch.heading, ch.body, s.canonical_url, cc.objective_id,
    ts_rank(ch.search_document, plainto_tsquery('english', left(p_query, 200))) as rank
  from public.chunk_concepts cc
  join public.source_chunks ch on ch.id=cc.chunk_id
  join public.source_revisions r on r.id=ch.revision_id and r.review_state='approved'
  join public.sources s on s.id=r.source_id and s.active_revision_id=r.id
    and s.status='approved' and s.permission_review='allowed'
  where cc.concept_id=p_concept_id and cc.objective_id=any(p_objective_ids)
  order by rank desc, s.canonical_url, ch.ordinal
  limit 40;
$$;
revoke all on function public.find_approved_lesson_passages(uuid,text[],text) from public, anon;
grant execute on function public.find_approved_lesson_passages(uuid,text[],text) to authenticated, service_role;

create function public.available_lesson_concepts() returns setof uuid
language sql stable security invoker set search_path = '' as $$
  select c.id from public.concepts c
  where c.supported and c.owner_id is null
    and c.catalogue_order in (1,2,5,9)
    and jsonb_array_length(c.objectives) > 0
    and not exists (
      select 1 from jsonb_array_elements(c.objectives) objective
      where not exists (
        select 1 from public.chunk_concepts cc
        join public.source_chunks ch on ch.id=cc.chunk_id
        join public.source_revisions r on r.id=ch.revision_id and r.review_state='approved'
        join public.sources s on s.id=r.source_id and s.active_revision_id=r.id
          and s.status='approved' and s.permission_review='allowed'
        where cc.concept_id=c.id and cc.objective_id=objective->>'id'
      )
    );
$$;
revoke all on function public.available_lesson_concepts() from public, anon;
grant execute on function public.available_lesson_concepts() to authenticated, service_role;
