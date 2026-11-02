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

create index if not exists family_members_user_id_idx    on public.family_members (user_id, created_at desc);
create index if not exists medical_records_user_id_idx   on public.medical_records (user_id, created_at desc);
create index if not exists medical_records_member_idx    on public.medical_records (family_member_id, created_at desc);
create index if not exists vaccinations_member_idx       on public.vaccinations (family_member_id, date_given desc);
create index if not exists chat_history_user_id_idx      on public.chat_history (user_id, created_at);

-- ---------------------------------------------------------------------------
-- Row level security: each user sees and changes only their own rows
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['family_members', 'medical_records', 'vaccinations', 'chat_history']
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
