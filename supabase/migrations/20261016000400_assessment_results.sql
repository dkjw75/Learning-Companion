-- A completed check completes its lesson session in the same transaction.
create function app_private.complete_lesson_after_check() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.completed_at is null and new.completed_at is not null then
    update public.lesson_sessions set completed_at = new.completed_at
      where id = new.session_id and owner_id = new.owner_id and completed_at is null;
  end if;
  return new;
end;
$$;

create trigger assessment_round_completes_lesson
after update of completed_at on public.assessment_rounds
for each row execute function app_private.complete_lesson_after_check();

-- Preserve completed checks submitted before this migration.
update public.lesson_sessions as session set completed_at = finished.completed_at
from (
  select session_id, owner_id, min(completed_at) as completed_at
  from public.assessment_rounds where completed_at is not null
  group by session_id, owner_id
) as finished
where session.id = finished.session_id and session.owner_id = finished.owner_id
  and session.completed_at is null;
