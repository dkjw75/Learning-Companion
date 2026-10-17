alter table public.tutor_messages
  add column selected_text text check (selected_text is null or length(selected_text) between 1 and 2000),
  add column step_id text;
