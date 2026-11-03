-- MediVault database schema
-- Run once in the Supabase SQL Editor of a new project. Safe to re-run.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.family_members (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name                    text not null,
  relation                text not null,              -- 'self' for the account holder
  dob                     date,
  gender                  text,
  blood_group             text,
  allergies               text,
  known_conditions        text,
  height_cm               numeric(5, 1),
  weight_kg               numeric(5, 1),
  emergency_contact_name  text,
  emergency_contact_phone text,
  created_at              timestamptz not null default now(),
  -- Lets child tables check that a member belongs to the same user.
  unique (id, user_id)
);

create table if not exists public.medical_records (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  family_member_id uuid not null,
  record_type      text not null default 'prescription',
  file_url         text not null,                      -- storage path: <user_id>/<timestamp>_<filename>
  doctor_name      text,
  hospital_name    text,
  record_date      date,
  extracted_data   jsonb,                              -- { doctor_name, record_date, medicines: [{ name, dosage, frequency }], notes }
  created_at       timestamptz not null default now(),
  -- Composite key: a record can only point at a member owned by the same user.
  foreign key (family_member_id, user_id)
    references public.family_members (id, user_id) on delete cascade
);

create table if not exists public.vaccinations (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  family_member_id uuid not null,
  vaccine_name     text not null,
  date_given       date,
  next_due_date    date,
  notes            text,
  created_at       timestamptz not null default now(),
  foreign key (family_member_id, user_id)
    references public.family_members (id, user_id) on delete cascade
);

create table if not exists public.chat_history (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

-- Public links to a member's emergency card (the QR code). Only a SHA-256 hash
-- of the link's token is stored; the token itself exists only in the link.
-- The public page (app/e/[token]) looks the hash up with the service-role key.
create table if not exists public.emergency_links (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  family_member_id uuid not null,
  token_hash       text not null unique,
  expires_at       timestamptz,                        -- null: until revoked
  revoked_at       timestamptz,                        -- set when revoked or replaced
  created_at       timestamptz not null default now(),
  foreign key (family_member_id, user_id)
    references public.family_members (id, user_id) on delete cascade
);

-- When a card link was opened. Timestamps only: no IP, device or location.
-- Written only by the public page (service role); the owner can read them.
create table if not exists public.emergency_link_opens (
  id        bigint generated always as identity primary key,
  link_id   uuid not null references public.emergency_links (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  opened_at timestamptz not null default now()
);

create index if not exists family_members_user_id_idx    on public.family_members (user_id, created_at desc);
create index if not exists medical_records_user_id_idx   on public.medical_records (user_id, created_at desc);
create index if not exists medical_records_member_idx    on public.medical_records (family_member_id, created_at desc);
create index if not exists vaccinations_member_idx       on public.vaccinations (family_member_id, date_given desc);
create index if not exists chat_history_user_id_idx      on public.chat_history (user_id, created_at);
create index if not exists emergency_link_opens_link_idx  on public.emergency_link_opens (link_id, opened_at desc);
-- One live link per member: making a new one means revoking the old one first.
create unique index if not exists emergency_links_one_live    on public.emergency_links (family_member_id) where revoked_at is null;

-- ---------------------------------------------------------------------------
-- Row level security: each user sees and changes only their own rows
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['family_members', 'medical_records', 'vaccinations', 'chat_history', 'emergency_links']
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "Users can view own rows" on public.%I', t);
    execute format('drop policy if exists "Users can insert own rows" on public.%I', t);
    execute format('drop policy if exists "Users can update own rows" on public.%I', t);
    execute format('drop policy if exists "Users can delete own rows" on public.%I', t);

    execute format($p$create policy "Users can view own rows" on public.%I
      for select to authenticated using ((select auth.uid()) = user_id)$p$, t);
    execute format($p$create policy "Users can insert own rows" on public.%I
      for insert to authenticated with check ((select auth.uid()) = user_id)$p$, t);
    execute format($p$create policy "Users can update own rows" on public.%I
      for update to authenticated using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id)$p$, t);
    execute format($p$create policy "Users can delete own rows" on public.%I
      for delete to authenticated using ((select auth.uid()) = user_id)$p$, t);
  end loop;
end
$$;

-- Opens: the owner can read them; nobody but the service role writes them.
alter table public.emergency_link_opens enable row level security;
drop policy if exists "Users can view own rows" on public.emergency_link_opens;
create policy "Users can view own rows" on public.emergency_link_opens
  for select to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Length limits (match lib/limits.ts) and safe file paths
-- The browser writes these tables directly, so the database is the server-side
-- check. NOT VALID: enforced on new and changed rows, existing rows are left alone.
-- ---------------------------------------------------------------------------

do $$
declare
  c record;
begin
  for c in
    select * from (values
      ('family_members',  'family_members_name_len',        'char_length(name) between 1 and 80'),
      ('family_members',  'family_members_relation_len',    'char_length(relation) <= 30'),
      ('family_members',  'family_members_gender_len',      'char_length(gender) <= 20'),
      ('family_members',  'family_members_blood_group_len', 'char_length(blood_group) <= 3'),
      ('family_members',  'family_members_allergies_len',   'char_length(allergies) <= 500'),
      ('family_members',  'family_members_conditions_len',  'char_length(known_conditions) <= 500'),
      ('family_members',  'family_members_ec_name_len',     'char_length(emergency_contact_name) <= 80'),
      ('family_members',  'family_members_ec_phone_len',    'char_length(emergency_contact_phone) <= 20'),
      ('medical_records', 'medical_records_doctor_len',     'char_length(doctor_name) <= 100'),
      ('medical_records', 'medical_records_hospital_len',   'char_length(hospital_name) <= 120'),
      ('medical_records', 'medical_records_type',           $c$record_type in ('prescription', 'lab_report', 'other')$c$),
      -- A record may only point at a file in its owner's folder.
      ('medical_records', 'medical_records_own_file',       $c$file_url like user_id::text || '/%' and file_url not like '%..%'$c$),
      ('medical_records', 'medical_records_extracted_size', 'pg_column_size(extracted_data) <= 32768'),
      ('vaccinations',    'vaccinations_name_len',          'char_length(vaccine_name) between 1 and 100'),
      ('vaccinations',    'vaccinations_notes_len',         'char_length(notes) <= 500'),
      ('vaccinations',    'vaccinations_has_date',          'date_given is not null or next_due_date is not null'),
      ('chat_history',    'chat_history_content_len',       'char_length(content) <= 20000'),
      ('emergency_links', 'emergency_links_token_hash',     $c$token_hash ~ '^[0-9a-f]{64}$'$c$)
    ) as t(tbl, name, expr)
  loop
    execute format('alter table public.%I drop constraint if exists %I', c.tbl, c.name);
    execute format('alter table public.%I add constraint %I check (%s) not valid', c.tbl, c.name, c.expr);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Storage: private bucket, files live under <user_id>/...
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'medical-records',
  'medical-records',
  false,
  10485760,  -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can view own medical files"   on storage.objects;
drop policy if exists "Users can upload own medical files" on storage.objects;
drop policy if exists "Users can update own medical files" on storage.objects;
drop policy if exists "Users can delete own medical files" on storage.objects;

create policy "Users can view own medical files" on storage.objects
  for select to authenticated
  using (bucket_id = 'medical-records' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can upload own medical files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'medical-records' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can update own medical files" on storage.objects
  for update to authenticated
  using (bucket_id = 'medical-records' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'medical-records' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can delete own medical files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'medical-records' and (storage.foldername(name))[1] = (select auth.uid())::text);
