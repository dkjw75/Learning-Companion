-- Keep generated MCQ feedback rules separate from later optional explanation rubrics.
alter table app_private.assessment_secrets
  add column feedback_criteria jsonb not null default '{}'::jsonb
  check (jsonb_typeof(feedback_criteria) = 'object');

create or replace function app_private.protect_assessment_keys() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.answer_keys is distinct from old.answer_keys or
     new.feedback_criteria is distinct from old.feedback_criteria or
     new.round_id is distinct from old.round_id then
    raise exception 'Issued assessment keys and feedback criteria are immutable.';
  end if;
  return new;
end;
$$;
