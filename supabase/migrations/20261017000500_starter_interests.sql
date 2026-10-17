alter table public.profiles drop constraint profile_interest_choices;
alter table public.profiles add constraint profile_interest_choices check (
  cardinality(interests) <= 10 and interests <@ array[
    'web_communication', 'apis', 'databases', 'cloud', 'cybersecurity',
    'web_development', 'ai_ml', 'data_science', 'mobile', 'game_development',
    'devops', 'ui_ux', 'hardware_iot', 'operating_systems'
  ]::text[]
);
