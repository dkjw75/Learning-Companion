-- Public question JSON must have the same allowlist as the shared DTO.
-- In particular, a privileged future generator cannot accidentally persist keys
-- or private feedback criteria in a learner-readable round or question bank.
create function app_private.validate_public_questions() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_question jsonb;
  v_option jsonb;
  v_field text;
begin
  if tg_table_name = 'assessment_rounds' then
    for v_question in select value from jsonb_array_elements(new.questions) loop
      if jsonb_typeof(v_question) <> 'object' then
        raise exception 'Public question must be an object.';
      end if;
      for v_field in select key from jsonb_object_keys(v_question) as key loop
        if v_field not in ('id','familyId','prompt','kind','objectiveIds','citationChunkIds','options') then
          raise exception 'Public question contains a non-public field.';
        end if;
      end loop;
      if not (v_question ?& array['id','familyId','prompt','kind','objectiveIds','citationChunkIds','options']) then
        raise exception 'Public question is missing a required field.';
      end if;
      for v_option in select value from jsonb_array_elements(v_question->'options') loop
        if jsonb_typeof(v_option) <> 'object' or
           (select array_agg(key order by key) from jsonb_object_keys(v_option) as key)
             is distinct from array['id','text']::text[] then
          raise exception 'Public option contains a non-public field.';
        end if;
      end loop;
    end loop;
  else
    if jsonb_typeof(new.options) <> 'array' then
      raise exception 'Public options must be an array.';
    end if;
    for v_option in select value from jsonb_array_elements(new.options) loop
      if jsonb_typeof(v_option) <> 'object' or
         (select array_agg(key order by key) from jsonb_object_keys(v_option) as key)
           is distinct from array['id','text']::text[] then
        raise exception 'Public option contains a non-public field.';
      end if;
    end loop;
  end if;
  return new;
end;
$$;
revoke all on function app_private.validate_public_questions() from public, anon, authenticated;
create trigger assessment_round_public_question_guard before insert or update on public.assessment_rounds
  for each row execute function app_private.validate_public_questions();
create trigger question_bank_public_option_guard before insert or update on public.question_bank
  for each row execute function app_private.validate_public_questions();
