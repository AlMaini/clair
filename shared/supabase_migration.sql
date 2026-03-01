-- Enable pgvector
create extension if not exists vector;

-- Users are handled by Supabase Auth, so no users table needed.

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  note_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  raw_content text not null,
  processed_content text,
  content_type text check (content_type in ('text', 'voice', 'image', 'link')) not null,
  category_id uuid references categories(id) on delete set null,
  tags text[] default '{}',
  embedding vector(1536),
  source_url text,
  file_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table resources (
  id uuid primary key default gen_random_uuid(),
  note_id uuid references notes(id) on delete cascade not null,
  title text not null,
  url text not null,
  resource_type text check (resource_type in ('video', 'article', 'post')) not null,
  created_at timestamptz default now()
);

-- Indexes
create index idx_notes_user on notes(user_id);
create index idx_notes_category on notes(category_id);
create index idx_notes_tags on notes using gin(tags);
create index idx_notes_embedding on notes using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index idx_categories_user on categories(user_id);
create index idx_resources_note on resources(note_id);

-- RLS policies (basic — user can only access their own data)
alter table notes enable row level security;
alter table categories enable row level security;
alter table resources enable row level security;

create policy "Users can CRUD their own notes"
  on notes for all using (auth.uid() = user_id);

create policy "Users can CRUD their own categories"
  on categories for all using (auth.uid() = user_id);

create policy "Users can read resources on their notes"
  on resources for all using (
    note_id in (select id from notes where user_id = auth.uid())
  );

-- pgvector similarity search used by the semantic search agent
create or replace function match_notes(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
returns table (id uuid, similarity float)
language sql stable
as $$
  select
    id,
    1 - (embedding <=> query_embedding) as similarity
  from notes
  where
    user_id = p_user_id
    and embedding is not null
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;
