-- RAG Migration for Supabase
-- Run this in Supabase SQL Editor

-- RAG Documents Table
create table if not exists rag_docs (
  id bigserial primary key,
  site_id text not null,
  title text,
  url text,
  kind text default 'page',
  content text,
  updated_at timestamptz default now()
);

-- Index for fast lookups
create index if not exists idx_rag_docs_site_id on rag_docs(site_id);
create index if not exists idx_rag_docs_kind on rag_docs(kind);
create index if not exists idx_rag_docs_updated_at on rag_docs(updated_at);

-- RAG Embeddings Table (simplified without pgvector for now)
-- TODO: Add pgvector extension when available
create table if not exists rag_embeddings (
  doc_id bigint references rag_docs(id) on delete cascade,
  embedding text, -- JSON array format for now: [0.1,0.2,...]
  created_at timestamptz default now(),
  primary key (doc_id)
);

-- Generation Events for Telemetry
create table if not exists gen_events (
  id bigserial primary key,
  user_id text not null,
  event_type text not null, -- 'generation.start', 'generation.success', etc.
  site_id text,
  topic text,
  model text,
  mode text, -- 'normal', 'short', 'backup'
  bytes_generated int,
  ms_elapsed int,
  error_message text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Index for analytics
create index if not exists idx_gen_events_user_id on gen_events(user_id);
create index if not exists idx_gen_events_type on gen_events(event_type);
create index if not exists idx_gen_events_created_at on gen_events(created_at);

-- Dead Letter Queue for failed generations
create table if not exists gen_dlq (
  id bigserial primary key,
  user_id text not null,
  site_id text,
  topic text,
  error_context jsonb,
  attempts int default 1,
  created_at timestamptz default now(),
  last_attempt_at timestamptz default now()
);

-- RLS Policies (Row Level Security)
alter table rag_docs enable row level security;
alter table rag_embeddings enable row level security;
alter table gen_events enable row level security;
alter table gen_dlq enable row level security;

-- Allow authenticated users to access their own data
create policy "Users can access their own RAG docs" on rag_docs
  for all using (true); -- Temporarily allow all, refine later

create policy "Users can access their own embeddings" on rag_embeddings
  for all using (true);

create policy "Users can access their own events" on gen_events
  for all using (true);

create policy "Users can access their own DLQ" on gen_dlq
  for all using (true);

-- Sample data insert (for testing)
-- This will be handled by the seedDemoData function