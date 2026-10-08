-- Stage 2 baseline. No client role is allowed to write assessment evidence or progress.
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  interests text[] not null default '{}',
  experience_level text not null default 'new' check (experience_level in ('new','some','experienced')),
  onboarding_complete boolean not null default false,
  diagnostic_evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(diagnostic_evidence) = 'array'),
  timezone text not null default 'Asia/Singapore',
  reduced_motion boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.concepts (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(title) between 1 and 120),
  normalized_title text generated always as (lower(btrim(title))) stored,
  area text not null check (area in ('web_communication','apis','databases','other')),
  objectives jsonb not null default '[]'::jsonb check (jsonb_typeof(objectives) = 'array'),
  aliases text[] not null default '{}',
  catalogue_order integer,
  supported boolean not null,
  content_available boolean not null default false,
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalogue_or_private check (
    (supported and owner_id is null and catalogue_order is not null and area <> 'other') or
    (not supported and owner_id is not null and catalogue_order is null and not content_available)
  )
);
create unique index concepts_catalogue_slug on public.concepts(slug) where owner_id is null;
create unique index concepts_catalogue_order on public.concepts(catalogue_order) where owner_id is null;
create unique index concepts_private_slug on public.concepts(owner_id, slug) where owner_id is not null;
create unique index concepts_private_normalized_title on public.concepts(owner_id, normalized_title) where owner_id is not null;

create table public.concept_edges (
  id uuid primary key default gen_random_uuid(),
  from_concept_id uuid not null references public.concepts(id) on delete cascade,
  to_concept_id uuid not null references public.concepts(id) on delete cascade,
  relation_type text not null check (relation_type in ('prerequisite','related')),
  reviewed boolean not null default false,
  owner_id uuid references auth.users(id) on delete cascade,
  supporting_source_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  check (from_concept_id <> to_concept_id),
  check ((reviewed and owner_id is null) or (not reviewed and owner_id is not null)),
  unique (from_concept_id, to_concept_id, relation_type, owner_id)
);
create unique index concept_edges_reviewed_unique on public.concept_edges(from_concept_id,to_concept_id,relation_type) where owner_id is null;
create index concept_edges_owner_idx on public.concept_edges(owner_id);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  canonical_url text not null unique,
  title text not null,
  host text not null,
  permission_review text not null default 'pending' check (permission_review in ('pending','allowed','rejected')),
  status text not null default 'draft' check (status in ('draft','approved','rejected')),
  active_revision_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.source_revisions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  content_hash text not null,
  source_version text,
  fetched_at timestamptz not null default now(),
  review_state text not null default 'pending' check (review_state in ('pending','approved','rejected')),
  reviewed_at timestamptz,
  storage_path text,
  unique(source_id, content_hash),
  unique(source_id, id)
);
alter table public.sources add constraint active_revision_belongs_to_source
  foreign key (id, active_revision_id) references public.source_revisions(source_id, id);
create table public.source_chunks (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.source_revisions(id) on delete cascade,
  heading text not null default '',
  ordinal integer not null check (ordinal >= 0),
  body text not null check (length(body) between 1 and 100000),
  unique(revision_id, ordinal)
);
create table public.source_concepts (
  source_id uuid not null references public.sources(id) on delete cascade,
  concept_id uuid not null references public.concepts(id) on delete cascade,
  primary key(source_id, concept_id)
);
create table public.chunk_concepts (
  chunk_id uuid not null references public.source_chunks(id) on delete cascade,
  concept_id uuid not null references public.concepts(id) on delete cascade,
  objective_id text not null default '',
  primary key(chunk_id, concept_id, objective_id)
);

create table public.content_packs (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public.concepts(id),
  version text not null,
  review_state text not null default 'draft' check (review_state in ('draft','reviewed','rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  active boolean not null default false,
  base_lesson jsonb not null default '{}'::jsonb,
  private_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (not active or (review_state = 'reviewed' and reviewed_by is not null and reviewed_at is not null)),
  unique(concept_id, version)
);
create unique index content_packs_one_active on public.content_packs(concept_id) where active;
create table public.question_bank (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.content_packs(id) on delete cascade,
  question_id text not null,
  family_id text not null,
  round_kind text not null check (round_kind in ('initial','review','confirmation')),
  kind text not null check (kind in ('recall','application')),
  prompt text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array'),
  objective_ids text[] not null,
  source_chunk_ids uuid[] not null default '{}',
  unique(pack_id, question_id),
  unique(pack_id, round_kind, family_id)
);

create table public.lesson_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  concept_id uuid not null references public.concepts(id),
  mode text not null check (mode in ('learn','review','explore')),
  generation_state text not null default 'pending' check (generation_state in ('pending','ready','failed')),
  lesson jsonb,
  source_mode text not null check (source_mode in ('source_grounded','unverified')),
  citation_snapshot jsonb not null default '[]'::jsonb,
  content_version text,
  current_step integer not null default 0 check (current_step >= 0),
  active_question_id text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, owner_id)
);
create index lesson_sessions_owner_idx on public.lesson_sessions(owner_id, created_at desc);
create table public.assessment_rounds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  owner_id uuid not null,
  kind text not null check (kind in ('initial','review','confirmation')),
  questions jsonb not null check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) = 3),
  source_mode text not null check (source_mode in ('source_grounded','unverified')),
  assessment_basis text not null check (assessment_basis in ('reviewed_key','ai_generated_key')),
  assisted_question_ids text[] not null default '{}',
  qualifies boolean,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(id, owner_id),
  unique(owner_id, session_id, kind),
  foreign key (session_id, owner_id) references public.lesson_sessions(id, owner_id) on delete cascade,
  check (source_mode <> 'unverified' or assessment_basis = 'ai_generated_key'),
  check ((completed_at is null and qualifies is null) or (completed_at is not null and qualifies is not null))
);
create index assessment_rounds_owner_idx on public.assessment_rounds(owner_id, created_at desc);
create table app_private.assessment_secrets (
  round_id uuid primary key references public.assessment_rounds(id) on delete cascade,
  answer_keys jsonb not null check (jsonb_typeof(answer_keys) = 'object'),
  explanation_rubric jsonb not null default '{}'::jsonb,
  visual_task_key jsonb not null default '{}'::jsonb
);
create table app_private.question_bank_keys (
  question_id uuid primary key references public.question_bank(id) on delete cascade,
  correct_option_id text not null,
  feedback_criteria jsonb not null default '{}'::jsonb
);
create table public.answer_attempts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  round_id uuid not null,
  question_id text not null,
  request_id uuid not null,
  attempt_index integer not null check (attempt_index >= 1),
  answer text not null,
  correct boolean not null,
  assisted boolean not null,
  independent boolean not null,
  objective_ids text[] not null default '{}',
  response_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (round_id, owner_id) references public.assessment_rounds(id, owner_id) on delete cascade,
  unique(round_id, question_id, attempt_index),
  unique(owner_id, round_id, request_id),
  check (independent = (attempt_index = 1 and not assisted))
);
create index answer_attempts_owner_idx on public.answer_attempts(owner_id, created_at desc);
create table public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  session_id uuid not null,
  request_id uuid not null,
  sequence_no integer not null check (sequence_no >= 0),
  role text not null check (role in ('user','assistant')),
  body text not null,
  citation_chunk_ids uuid[] not null default '{}',
  source_mode text not null check (source_mode in ('source_grounded','unverified')),
  highlight_node_ids text[] not null default '{}',
  highlight_edge_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  foreign key (session_id, owner_id) references public.lesson_sessions(id, owner_id) on delete cascade,
  unique(session_id, sequence_no),
  unique(owner_id, session_id, request_id, role)
);
create index tutor_messages_owner_idx on public.tutor_messages(owner_id, created_at desc);
create table public.user_concept_progress (
  owner_id uuid not null references auth.users(id) on delete cascade,
  concept_id uuid not null references public.concepts(id) on delete cascade,
  learning_status text not null default 'not_assessed' check (learning_status in ('not_assessed','explored','developing','demonstrated_understanding')),
  latest_completed_round_id uuid references public.assessment_rounds(id),
  last_explored_at timestamptz,
  last_reviewed_at timestamptz,
  completed_check_count integer not null default 0 check (completed_check_count >= 0),
  updated_at timestamptz not null default now(),
  primary key(owner_id, concept_id)
);
create table app_private.operation_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  operation_kind text not null,
  request_id uuid not null,
  input_hash text not null,
  state text not null check (state in ('pending','completed','failed','uncertain')),
  usage_metadata jsonb not null default '{}'::jsonb,
  result_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, operation_kind, request_id)
);
create table app_private.guest_merge_tickets (
  ticket_hash text primary key,
  guest_user_id uuid not null references auth.users(id) on delete cascade,
  destination_user_id uuid references auth.users(id),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Profile creation is tied to Supabase Auth, never to caller-supplied IDs.
create function app_private.create_profile_for_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function app_private.create_profile_for_user() from public, anon, authenticated;
create trigger learning_companion_new_user after insert on auth.users
for each row execute function app_private.create_profile_for_user();

-- Every exposed table has RLS plus an explicit grant boundary. Client roles cannot
-- insert or update evidence, completion, private keys, source reviews, or catalogue data.
alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.concepts enable row level security;
alter table public.concept_edges enable row level security;
alter table public.sources enable row level security;
alter table public.source_revisions enable row level security;
alter table public.source_chunks enable row level security;
alter table public.source_concepts enable row level security;
alter table public.chunk_concepts enable row level security;
alter table public.content_packs enable row level security;
alter table public.question_bank enable row level security;
alter table public.lesson_sessions enable row level security;
alter table public.assessment_rounds enable row level security;
alter table public.answer_attempts enable row level security;
alter table public.tutor_messages enable row level security;
alter table public.user_concept_progress enable row level security;
alter table app_private.assessment_secrets enable row level security;
alter table app_private.question_bank_keys enable row level security;
alter table app_private.operation_requests enable row level security;
alter table app_private.guest_merge_tickets enable row level security;

revoke all on public.profiles, public.admin_users, public.concepts, public.concept_edges,
  public.sources, public.source_revisions, public.source_chunks, public.source_concepts,
  public.chunk_concepts, public.content_packs, public.question_bank, public.lesson_sessions,
  public.assessment_rounds, public.answer_attempts, public.tutor_messages,
  public.user_concept_progress from anon, authenticated;
revoke all on app_private.assessment_secrets, app_private.question_bank_keys,
  app_private.operation_requests, app_private.guest_merge_tickets from public, anon, authenticated;
grant select on public.profiles, public.concepts, public.concept_edges, public.sources,
  public.source_revisions, public.source_chunks, public.source_concepts, public.chunk_concepts,
  public.question_bank, public.lesson_sessions, public.assessment_rounds,
  public.answer_attempts, public.tutor_messages, public.user_concept_progress to authenticated;

create policy profiles_own_read on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy concepts_catalogue_or_own on public.concepts for select to authenticated
  using ((supported and owner_id is null) or owner_id = (select auth.uid()));
create policy edges_reviewed_or_own on public.concept_edges for select to authenticated
  using ((reviewed and owner_id is null) or owner_id = (select auth.uid()));
create policy sources_approved on public.sources for select to authenticated
  using (status = 'approved' and permission_review = 'allowed' and active_revision_id is not null);
create policy revisions_active on public.source_revisions for select to authenticated
  using (review_state = 'approved' and exists (
    select 1 from public.sources s where s.id = source_id and s.active_revision_id = source_revisions.id
  ));
create policy chunks_active on public.source_chunks for select to authenticated
  using (exists (select 1 from public.source_revisions r where r.id = revision_id));
create policy source_concepts_approved on public.source_concepts for select to authenticated
  using (exists (select 1 from public.sources s where s.id = source_id));
create policy chunk_concepts_approved on public.chunk_concepts for select to authenticated
  using (exists (select 1 from public.source_chunks c where c.id = chunk_id));
create policy sessions_own on public.lesson_sessions for select to authenticated
  using (owner_id = (select auth.uid()));
create policy rounds_own on public.assessment_rounds for select to authenticated
  using (owner_id = (select auth.uid()));
create policy attempts_own on public.answer_attempts for select to authenticated
  using (owner_id = (select auth.uid()));
create policy messages_own on public.tutor_messages for select to authenticated
  using (owner_id = (select auth.uid()));
create policy progress_own on public.user_concept_progress for select to authenticated
  using (owner_id = (select auth.uid()));

-- Only prompts from a currently active, reviewed pack are public. The helper
-- reads pack metadata without granting clients access to private_metadata.
create function public.is_active_reviewed_pack(p_pack_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.content_packs p
    where p.id = p_pack_id and p.active and p.review_state = 'reviewed');
$$;
revoke all on function public.is_active_reviewed_pack(uuid) from public, anon;
grant execute on function public.is_active_reviewed_pack(uuid) to authenticated;
create policy question_bank_reviewed on public.question_bank for select to authenticated
  using (public.is_active_reviewed_pack(pack_id));

-- Enforce private graph ownership even for privileged import paths.
create function app_private.validate_concept_edge() returns trigger
language plpgsql set search_path = '' as $$
declare v_from_owner uuid; v_to_owner uuid;
begin
  select owner_id into v_from_owner from public.concepts where id = new.from_concept_id;
  select owner_id into v_to_owner from public.concepts where id = new.to_concept_id;
  if new.owner_id is null then
    if v_from_owner is not null or v_to_owner is not null then
      raise exception 'Reviewed edges must connect catalogue concepts.';
    end if;
  elsif (v_from_owner is not null and v_from_owner <> new.owner_id)
     or (v_to_owner is not null and v_to_owner <> new.owner_id) then
    raise exception 'A private edge cannot reference another learner''s concept.';
  end if;
  return new;
end;
$$;
create trigger concept_edge_access before insert or update on public.concept_edges
  for each row execute function app_private.validate_concept_edge();

-- Round snapshots are immutable once issued. The application question and family
-- constraints also protect this RPC if a future importer sends malformed data.
create function app_private.validate_assessment_round() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_question jsonb;
  v_ids text[] := '{}';
  v_families text[] := '{}';
  v_option jsonb;
  v_option_ids text[];
  v_application_count integer := 0;
  v_session_source_mode text;
begin
  if tg_op = 'UPDATE' then
    if new.questions is distinct from old.questions or new.session_id is distinct from old.session_id
       or new.owner_id is distinct from old.owner_id or new.source_mode is distinct from old.source_mode
       or new.assessment_basis is distinct from old.assessment_basis or new.kind is distinct from old.kind then
      raise exception 'Assessment round identity and questions are immutable.';
    end if;
    return new;
  end if;
  select source_mode into v_session_source_mode from public.lesson_sessions
    where id = new.session_id and owner_id = new.owner_id;
  if v_session_source_mode is null or v_session_source_mode <> new.source_mode then
    raise exception 'Assessment source mode must match its session.';
  end if;
  for v_question in select value from jsonb_array_elements(new.questions) loop
    if coalesce(v_question->>'id','') = '' or coalesce(v_question->>'familyId','') = ''
       or v_question->>'kind' not in ('recall','application')
       or jsonb_typeof(v_question->'options') is distinct from 'array'
       or jsonb_typeof(v_question->'objectiveIds') is distinct from 'array'
       or jsonb_array_length(v_question->'objectiveIds') < 1
       or jsonb_array_length(v_question->'options') not between 2 and 6 then
      raise exception 'Assessment question structure is invalid.';
    end if;
    if (v_question->>'id') = any(v_ids) or (v_question->>'familyId') = any(v_families) then
      raise exception 'Assessment question IDs and families must be distinct.';
    end if;
    v_ids := array_append(v_ids, v_question->>'id');
    v_families := array_append(v_families, v_question->>'familyId');
    if v_question->>'kind' = 'application' then v_application_count := v_application_count + 1; end if;
    v_option_ids := '{}';
    for v_option in select value from jsonb_array_elements(v_question->'options') loop
      if coalesce(v_option->>'id','') = '' or (v_option->>'id') = any(v_option_ids) then
        raise exception 'Assessment option IDs must be non-empty and distinct.';
      end if;
      v_option_ids := array_append(v_option_ids, v_option->>'id');
    end loop;
  end loop;
  if v_application_count = 0 then raise exception 'Assessment requires an application question.'; end if;
  return new;
end;
$$;
create trigger assessment_round_structure before insert or update on public.assessment_rounds
  for each row execute function app_private.validate_assessment_round();

create function app_private.validate_assessment_keys() returns trigger
language plpgsql set search_path = '' as $$
declare v_questions jsonb; v_question jsonb;
begin
  select questions into v_questions from public.assessment_rounds where id = new.round_id;
  if v_questions is null or (select count(*) from jsonb_object_keys(new.answer_keys)) <> 3 then
    raise exception 'Exactly three answer keys are required.';
  end if;
  for v_question in select value from jsonb_array_elements(v_questions) loop
    if not exists (select 1 from jsonb_array_elements(v_question->'options')
      where value->>'id' = new.answer_keys->>(v_question->>'id')) then
      raise exception 'Answer key must match a public option for every question.';
    end if;
  end loop;
  return new;
end;
$$;
create trigger assessment_keys_match_round before insert or update on app_private.assessment_secrets
  for each row execute function app_private.validate_assessment_keys();

-- Callable with a learner JWT. The function derives ownership from auth.uid(),
-- reads server-only keys, serializes submissions, and commits evidence plus its
-- progress projection in the same Postgres transaction. No result is accepted
-- from the caller, and there is no public write grant on either output table.
create function public.submit_mcq_answer(
  p_round_id uuid, p_question_id text, p_answer text, p_request_id uuid
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_round record;
  v_existing public.answer_attempts%rowtype;
  v_question jsonb;
  v_keys jsonb;
  v_correct boolean;
  v_assisted boolean;
  v_attempt_id uuid;
  v_answered integer;
  v_qualifies boolean;
  v_previous text;
  v_current text;
  v_completed boolean := false;
  v_response jsonb;
  v_progress_update jsonb;
begin
  if v_owner is null then raise exception 'Authentication required.' using errcode = '28000'; end if;
  if p_question_id is null or length(p_question_id) > 100 or p_answer is null
     or length(p_answer) > 100 or p_request_id is null then
    raise exception 'Invalid answer request.' using errcode = '22023';
  end if;
  select r.*, s.concept_id into v_round from public.assessment_rounds r
    join public.lesson_sessions s on s.id = r.session_id and s.owner_id = r.owner_id
    where r.id = p_round_id and r.owner_id = v_owner for update of r;
  if not found then raise exception 'Round not found.' using errcode = '02000'; end if;
  select * into v_existing from public.answer_attempts
    where owner_id = v_owner and round_id = p_round_id and request_id = p_request_id;
  if found then
    if v_existing.question_id <> p_question_id or v_existing.answer <> p_answer then
      raise exception 'Request ID was reused with different input.' using errcode = '23505';
    end if;
    return v_existing.response_snapshot;
  end if;
  if v_round.completed_at is not null then
    raise exception 'Round is already completed.' using errcode = '23514';
  end if;
  select value into v_question from jsonb_array_elements(v_round.questions)
    where value->>'id' = p_question_id;
  if v_question is null then raise exception 'Question not found.' using errcode = '22023'; end if;
  if not exists(select 1 from jsonb_array_elements(v_question->'options')
    where value->>'id' = p_answer) then
    raise exception 'Answer option not found.' using errcode = '22023';
  end if;
  if exists(select 1 from public.answer_attempts where round_id = p_round_id and question_id = p_question_id) then
    raise exception 'First answer already recorded.' using errcode = '23505';
  end if;
  select answer_keys into v_keys from app_private.assessment_secrets where round_id = p_round_id;
  if v_keys is null or v_keys->>p_question_id is null then
    raise exception 'Assessment key is unavailable.' using errcode = '23514';
  end if;
  v_correct := (v_keys->>p_question_id = p_answer);
  v_assisted := p_question_id = any(v_round.assisted_question_ids);
  insert into public.answer_attempts (
    owner_id, round_id, question_id, request_id, attempt_index, answer,
    correct, assisted, independent, objective_ids
  ) values (
    v_owner, p_round_id, p_question_id, p_request_id, 1, p_answer,
    v_correct, v_assisted, not v_assisted,
    array(select jsonb_array_elements_text(v_question->'objectiveIds'))
  ) returning id into v_attempt_id;
  select count(*) into v_answered from public.answer_attempts where round_id = p_round_id and attempt_index = 1;
  if v_answered = 3 then
    select count(*) = 3 and bool_and(correct and independent) into v_qualifies
      from public.answer_attempts where round_id = p_round_id and attempt_index = 1;
    v_current := case when v_qualifies then 'demonstrated_understanding' else 'developing' end;
    insert into public.user_concept_progress (owner_id, concept_id, learning_status)
      values (v_owner, v_round.concept_id, 'developing') on conflict do nothing;
    select learning_status into v_previous from public.user_concept_progress
      where owner_id = v_owner and concept_id = v_round.concept_id for update;
    update public.assessment_rounds set completed_at = now(), qualifies = v_qualifies
      where id = p_round_id;
    update public.user_concept_progress set learning_status = v_current,
      latest_completed_round_id = p_round_id,
      completed_check_count = completed_check_count + 1,
      last_reviewed_at = case when v_round.kind = 'review' then now() else last_reviewed_at end,
      updated_at = now()
      where owner_id = v_owner and concept_id = v_round.concept_id;
    v_completed := true;
    v_progress_update := jsonb_build_object(
      'conceptId', v_round.concept_id, 'previousStatus', v_previous,
      'currentStatus', v_current, 'changed', v_previous <> v_current,
      'evidenceRoundId', p_round_id, 'sourceMode', v_round.source_mode,
      'assessmentBasis', v_round.assessment_basis
    );
  else
    -- Partial evidence may establish Developing only if no completed result exists.
    insert into public.user_concept_progress (owner_id, concept_id, learning_status)
      values (v_owner, v_round.concept_id, 'developing') on conflict do nothing;
  end if;
  v_response := jsonb_build_object(
    'evidence', jsonb_build_object(
      'id', v_attempt_id, 'roundId', p_round_id, 'questionId', p_question_id,
      'requestId', p_request_id, 'attemptIndex', 1, 'answer', p_answer,
      'correct', v_correct, 'assisted', v_assisted, 'independent', not v_assisted,
      'objectiveIds', to_jsonb(array(select jsonb_array_elements_text(v_question->'objectiveIds')))
    ),
    'feedback', case when v_correct then 'Correct.' else 'This answer needs review.' end,
    'completed', v_completed
  );
  if v_completed then v_response := v_response || jsonb_build_object('progressUpdate', v_progress_update); end if;
  update public.answer_attempts set response_snapshot = v_response where id = v_attempt_id;
  return v_response;
end;
$$;
revoke all on function public.submit_mcq_answer(uuid,text,text,uuid) from public, anon;
grant execute on function public.submit_mcq_answer(uuid,text,text,uuid) to authenticated;

-- The server key may seed reviewed content and store private keys. Never expose
-- it in Vite variables or send it to a browser. All normal API reads use JWT scope.
grant usage on schema app_private to service_role;
grant all on all tables in schema app_private to service_role;
grant all on public.profiles, public.admin_users, public.concepts, public.concept_edges,
  public.sources, public.source_revisions, public.source_chunks, public.source_concepts,
  public.chunk_concepts, public.content_packs, public.question_bank, public.lesson_sessions,
  public.assessment_rounds, public.answer_attempts, public.tutor_messages,
  public.user_concept_progress to service_role;
