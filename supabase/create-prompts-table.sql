-- テーブル（CSVスキーマに合わせる）
create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  prompt_id text unique,
  industry text,
  purpose text,
  format text,
  name text not null,
  description text,
  price numeric default 0,
  is_free boolean default false,
  system_prompt text,
  user_prompt_template text,
  gen_config jsonb default '{}'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 便利インデックス
create index if not exists idx_prompts_active_created
  on public.prompts (is_active, created_at desc);

-- RLS（匿名でも「公開中(is_active=true)」だけ読めるように）
alter table public.prompts enable row level security;

drop policy if exists "read-active-prompts" on public.prompts;
create policy "read-active-prompts" on public.prompts
for select
to anon
using ( is_active = true );