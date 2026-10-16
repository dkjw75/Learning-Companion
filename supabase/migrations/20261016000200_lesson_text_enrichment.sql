-- Explanations may improve in place; diagram, source and assessment context stays frozen.
create or replace function app_private.protect_lesson_snapshot() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.generation_state = 'ready' and (
    new.generation_state is distinct from old.generation_state or
    new.mode is distinct from old.mode or
    new.citation_snapshot is distinct from old.citation_snapshot or
    new.content_version is distinct from old.content_version or
    new.source_mode is distinct from old.source_mode or
    new.concept_id is distinct from old.concept_id or
    new.owner_id is distinct from old.owner_id or
    (new.lesson - 'steps') is distinct from (old.lesson - 'steps') or
    jsonb_typeof(new.lesson->'steps') is distinct from 'array' or
    (select jsonb_agg(value - array['caption','explanation','workedExample','commonMistake'] order by ordinality)
      from jsonb_array_elements(new.lesson->'steps') with ordinality) is distinct from
    (select jsonb_agg(value - array['caption','explanation','workedExample','commonMistake'] order by ordinality)
      from jsonb_array_elements(old.lesson->'steps') with ordinality) or
    exists (select 1 from jsonb_array_elements(new.lesson->'steps') as step
      cross join unnest(array['caption','explanation','workedExample','commonMistake']) as field
      where jsonb_typeof(step->field) is distinct from 'string')
  ) then
    raise exception 'Issued lesson context is immutable; only explanation text may change.';
  end if;
  return new;
end;
$$;
