-- Once a lesson is issued, preserve its source and diagram/question context.
create function app_private.protect_lesson_snapshot() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.generation_state='ready' and
     (new.lesson is distinct from old.lesson or
      new.citation_snapshot is distinct from old.citation_snapshot or
      new.content_version is distinct from old.content_version or
      new.source_mode is distinct from old.source_mode or
      new.concept_id is distinct from old.concept_id or
      new.owner_id is distinct from old.owner_id) then
    raise exception 'Issued lesson snapshots are immutable.';
  end if;
  return new;
end;
$$;
revoke all on function app_private.protect_lesson_snapshot() from public, anon, authenticated;
create trigger lesson_snapshot_immutable before update on public.lesson_sessions
  for each row execute function app_private.protect_lesson_snapshot();

create function app_private.protect_assessment_keys() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.answer_keys is distinct from old.answer_keys or new.round_id is distinct from old.round_id then
    raise exception 'Issued answer keys are immutable.';
  end if;
  return new;
end;
$$;
revoke all on function app_private.protect_assessment_keys() from public, anon, authenticated;
create trigger assessment_keys_immutable before update on app_private.assessment_secrets
  for each row execute function app_private.protect_assessment_keys();
