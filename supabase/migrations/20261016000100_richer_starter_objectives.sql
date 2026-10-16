-- Keep objective IDs stable so existing source mappings and lesson snapshots remain valid.
update public.concepts set objectives = jsonb_build_array(jsonb_build_object(
  'id', 'client-server-roles',
  'description', 'Explain the client and server roles, then trace how a browser request leads to a server response and a displayed page.'))
where slug = 'clients-and-servers' and owner_id is null
  and objectives = '[{"id":"client-server-roles","description":"Explain the roles of a client and server in a web exchange."}]'::jsonb;

update public.concepts set objectives = jsonb_build_array(jsonb_build_object(
  'id', 'http-exchange',
  'description', 'Trace a browser HTTP exchange and identify the method, path, headers, status, and optional bodies in its request and response.'))
where slug = 'http-requests-and-responses' and owner_id is null
  and objectives = '[{"id":"http-exchange","description":"Identify the request and response in a web exchange."}]'::jsonb;

update public.concepts set objectives = jsonb_build_array(jsonb_build_object(
  'id', 'api-contract',
  'description', 'Explain an API as a software interface, distinguish it from a human interface, and trace a client using an exposed capability.'))
where slug = 'what-an-api-does' and owner_id is null
  and objectives = '[{"id":"api-contract","description":"Explain how an API exposes operations or data to a client."}]'::jsonb;

update public.concepts set objectives = jsonb_build_array(jsonb_build_object(
  'id', 'table-record',
  'description', 'Identify a table, its typed columns and rows, then match values in an INSERT statement to their named columns.'))
where slug = 'tables-and-records' and owner_id is null
  and objectives = '[{"id":"table-record","description":"Identify tables, columns, and records in a relational database."}]'::jsonb;
