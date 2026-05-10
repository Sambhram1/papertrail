create table if not exists public.papertrail_analyses (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  title text not null,
  document_type text not null,
  one_line_summary text not null,
  plain_english_explanation text not null,
  deadlines jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  risk_level text not null check (risk_level in ('high', 'medium', 'low')),
  risks jsonb not null default '[]'::jsonb,
  suggested_reply text not null,
  entities jsonb not null default '[]'::jsonb,
  source_preview text not null,
  source_kind text,
  source_file_path text,
  source_file_url text,
  source_file_name text,
  source_file_type text,
  source_file_size integer,
  source_note text,
  source_url text,
  source_title text,
  source_thumbnail_url text,
  source_thumbnail_file_path text,
  source_thumbnail_file_url text,
  source_thumbnail_file_name text,
  source_thumbnail_file_type text,
  source_thumbnail_file_size integer
);

alter table public.papertrail_analyses
  add column if not exists source_note text,
  add column if not exists source_url text,
  add column if not exists source_title text,
  add column if not exists source_thumbnail_url text,
  add column if not exists source_thumbnail_file_path text,
  add column if not exists source_thumbnail_file_url text,
  add column if not exists source_thumbnail_file_name text,
  add column if not exists source_thumbnail_file_type text,
  add column if not exists source_thumbnail_file_size integer;

create index if not exists papertrail_analyses_user_created_idx
  on public.papertrail_analyses (user_id, created_at desc);

alter table public.papertrail_analyses enable row level security;

create policy "Users can read their PaperTrail analyses"
  on public.papertrail_analyses
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their PaperTrail analyses"
  on public.papertrail_analyses
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their PaperTrail analyses"
  on public.papertrail_analyses
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('papertrail-uploads', 'papertrail-uploads', false)
on conflict (id) do nothing;

create policy "Users can read their PaperTrail uploads"
  on storage.objects
  for select
  using (
    bucket_id = 'papertrail-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can upload their PaperTrail files"
  on storage.objects
  for insert
  with check (
    bucket_id = 'papertrail-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

notify pgrst, 'reload schema';
