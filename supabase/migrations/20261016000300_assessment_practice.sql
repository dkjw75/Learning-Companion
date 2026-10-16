-- A hint records assistance before returning guidance. Replays change no evidence.
create function public.request_mcq_hint(p_round_id uuid, p_question_id text, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_round record;
  v_question jsonb;
  v_step jsonb;
  v_hint text;
begin
  if v_owner is null then raise exception 'Authentication required.' using errcode = '28000'; end if;
  if p_question_id is null or length(p_question_id) > 100 or p_request_id is null then
    raise exception 'Invalid hint request.' using errcode = '22023';
  end if;
  select r.*, s.lesson into v_round from public.assessment_rounds r
    join public.lesson_sessions s on s.id = r.session_id and s.owner_id = r.owner_id
    where r.id = p_round_id and r.owner_id = v_owner for update of r;
  if not found then raise exception 'Round not found.' using errcode = '02000'; end if;
  select value into v_question from jsonb_array_elements(v_round.questions)
    where value->>'id' = p_question_id;
  if v_question is null then raise exception 'Question not found.' using errcode = '22023'; end if;
  if not p_question_id = any(v_round.assisted_question_ids) then
    update public.assessment_rounds set assisted_question_ids = array_append(assisted_question_ids, p_question_id)
      where id = p_round_id;
  end if;
  select value into v_step from jsonb_array_elements(coalesce(v_round.lesson->'steps','[]'::jsonb))
    where (value->'citationChunkIds') ?| array(select jsonb_array_elements_text(v_question->'citationChunkIds'))
    limit 1;
  v_hint := case when v_step is null then 'Review the lesson example and the sources for this question before choosing.'
    else format('Review the "%s" step and its worked example, then compare the choices.', v_step->>'heading') end;
  return jsonb_build_object('hint', v_hint, 'assisted', true);
end;
$$;
revoke all on function public.request_mcq_hint(uuid,text,uuid) from public, anon;
grant execute on function public.request_mcq_hint(uuid,text,uuid) to authenticated;

-- Practice retries retain the first answer and never revise a completed result.
create or replace function public.submit_mcq_answer(
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
  v_attempt_index integer;
  v_latest_correct boolean;
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
  select value into v_question from jsonb_array_elements(v_round.questions)
    where value->>'id' = p_question_id;
  if v_question is null then raise exception 'Question not found.' using errcode = '22023'; end if;
  if not exists(select 1 from jsonb_array_elements(v_question->'options')
    where value->>'id' = p_answer) then
    raise exception 'Answer option not found.' using errcode = '22023';
  end if;
  select coalesce(max(attempt_index),0)+1 into v_attempt_index from public.answer_attempts
    where round_id = p_round_id and question_id = p_question_id;
  if v_attempt_index = 1 and v_round.completed_at is not null then
    raise exception 'Round is already completed.' using errcode = '23514';
  end if;
  if v_attempt_index > 1 then
    select correct into v_latest_correct from public.answer_attempts
      where round_id = p_round_id and question_id = p_question_id
      order by attempt_index desc limit 1;
    if v_latest_correct then raise exception 'Answer is already correct.' using errcode = '23514'; end if;
  end if;
  select answer_keys into v_keys from app_private.assessment_secrets where round_id = p_round_id;
  if v_keys is null or v_keys->>p_question_id is null then
    raise exception 'Assessment key is unavailable.' using errcode = '23514';
  end if;
  v_correct := (v_keys->>p_question_id = p_answer);
  v_assisted := v_attempt_index > 1 or p_question_id = any(v_round.assisted_question_ids);
  insert into public.answer_attempts (
    owner_id, round_id, question_id, request_id, attempt_index, answer,
    correct, assisted, independent, objective_ids
  ) values (
    v_owner, p_round_id, p_question_id, p_request_id, v_attempt_index, p_answer,
    v_correct, v_assisted, v_attempt_index = 1 and not v_assisted,
    array(select jsonb_array_elements_text(v_question->'objectiveIds'))
  ) returning id into v_attempt_id;
  if v_attempt_index = 1 then
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
      insert into public.user_concept_progress (owner_id, concept_id, learning_status)
        values (v_owner, v_round.concept_id, 'developing') on conflict do nothing;
    end if;
  end if;
  v_response := jsonb_build_object(
    'evidence', jsonb_build_object(
      'id', v_attempt_id, 'roundId', p_round_id, 'questionId', p_question_id,
      'requestId', p_request_id, 'attemptIndex', v_attempt_index, 'answer', p_answer,
      'correct', v_correct, 'assisted', v_assisted,
      'independent', v_attempt_index = 1 and not v_assisted,
      'objectiveIds', to_jsonb(array(select jsonb_array_elements_text(v_question->'objectiveIds')))
    ),
    'feedback', case when v_correct then 'Correct.' else 'Not quite. Try another choice or ask for a hint.' end,
    'completed', v_completed
  );
  if v_completed then v_response := v_response || jsonb_build_object('progressUpdate', v_progress_update); end if;
  update public.answer_attempts set response_snapshot = v_response where id = v_attempt_id;
  return v_response;
end;
$$;
