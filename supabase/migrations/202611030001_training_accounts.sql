-- Run once in Supabase SQL Editor, or apply with the Supabase CLI.
create table public.training_documents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  document jsonb not null default '{"version":2,"workouts":[],"templates":[]}'::jsonb,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  constraint training_document_shape check (
    jsonb_typeof(document) = 'object' and
    document @> '{"version":2}'::jsonb and
    jsonb_typeof(document->'workouts') = 'array' and
    jsonb_typeof(document->'templates') = 'array'
  )
);

alter table public.training_documents enable row level security;

create policy "Read own training document" on public.training_documents
  for select to authenticated using ((select auth.uid()) = user_id);

-- Writes are only exposed through the versioned RPC, so clients cannot bypass CAS.
revoke all on table public.training_documents from anon, authenticated;

grant select on table public.training_documents to authenticated;

create function public.save_training_document(
  p_owner uuid,
  p_expected_revision bigint,
  p_document jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  current_revision bigint;
begin
  if owner_id is null or p_owner is distinct from owner_id then
    raise exception 'ACCOUNT_MISMATCH' using errcode = '42501';
  end if;

  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'INVALID_REVISION' using errcode = '22023';
  end if;

  if p_document is null or jsonb_typeof(p_document) is distinct from 'object'
     or p_document->>'version' is distinct from '2'
     or jsonb_typeof(p_document->'workouts') is distinct from 'array'
     or jsonb_typeof(p_document->'templates') is distinct from 'array' then
    raise exception 'INVALID_DOCUMENT' using errcode = '22023';
  end if;

  insert into public.training_documents(user_id)
  values(owner_id)
  on conflict do nothing;
  select revision
  into current_revision
  from public.training_documents
  where user_id = owner_id
  for update;
  if current_revision <> p_expected_revision then
    raise exception 'SYNC_CONFLICT' using errcode = 'P0001';
  end if;

  update public.training_documents
  set document = p_document,
      revision = revision + 1,
      updated_at = now()
  where user_id = owner_id;
  return jsonb_build_object('revision', current_revision+1);
end;
$$;

revoke all on function public.save_training_document(uuid,bigint,jsonb) from public, anon;

grant execute on function public.save_training_document(uuid,bigint,jsonb) to authenticated;
