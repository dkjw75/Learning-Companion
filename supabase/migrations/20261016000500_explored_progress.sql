-- A ready lesson is learning activity even before its first quiz answer.
create function app_private.mark_lesson_explored() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.generation_state = 'ready' and new.lesson is not null then
    insert into public.user_concept_progress (owner_id, concept_id, learning_status, last_explored_at)
      values (new.owner_id, new.concept_id, 'explored', new.created_at)
    on conflict (owner_id, concept_id) do update set
      learning_status = case when public.user_concept_progress.learning_status = 'not_assessed'
        then 'explored' else public.user_concept_progress.learning_status end,
      last_explored_at = greatest(public.user_concept_progress.last_explored_at, excluded.last_explored_at),
      updated_at = now();
  end if;
  return new;
end;
$$;

create trigger lesson_session_explored
after insert or update of generation_state on public.lesson_sessions
for each row execute function app_private.mark_lesson_explored();

-- Include existing saved lessons without lowering assessment-backed statuses.
insert into public.user_concept_progress (owner_id, concept_id, learning_status, last_explored_at)
select owner_id, concept_id, 'explored', max(created_at)
from public.lesson_sessions
where generation_state = 'ready' and lesson is not null
group by owner_id, concept_id
on conflict (owner_id, concept_id) do update set
  learning_status = case when public.user_concept_progress.learning_status = 'not_assessed'
    then 'explored' else public.user_concept_progress.learning_status end,
  last_explored_at = greatest(public.user_concept_progress.last_explored_at, excluded.last_explored_at),
  updated_at = now();
