-- A learner may save only their own onboarding fields. Assessment and progress
-- tables retain their read-only client boundary.
alter table public.profiles add constraint profile_interest_choices check (
  cardinality(interests) <= 3 and interests <@ array['web_communication','apis','databases']::text[]
);
alter table public.profiles add constraint profile_diagnostic_bound check (
  jsonb_array_length(diagnostic_evidence) <= 5
);
grant update (interests, experience_level, timezone, diagnostic_evidence, onboarding_complete, updated_at)
  on public.profiles to authenticated;
create policy profiles_own_onboarding_update on public.profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
