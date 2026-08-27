-- Run this in Supabase SQL editor

create table if not exists user_accounts (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  display_name text not null,
  role text not null default 'student' check (role in ('student','admin')),
  created_at timestamptz default now()
);

create table if not exists sessions (
  token text primary key,
  user_id uuid references user_accounts(id) on delete cascade,
  role text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

create table if not exists papers (
  id uuid primary key default gen_random_uuid(),
  academic_session text not null,
  exam_year int not null,
  subject text not null check (subject in ('physics','chemistry','mathematics','computer_science')),
  paper_type text not null default 'board' check (paper_type in ('board','sqp')),
  set_code text not null default '1',
  paper_url text,
  answer_key_url text,
  total_marks int,
  duration_minutes int,
  created_at timestamptz default now()
);

create table if not exists topics (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  unit_name text not null,
  chapter_name text not null,
  official_marks_weightage int,
  academic_session text,
  created_at timestamptz default now()
);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid references papers(id) on delete cascade,
  question_number text not null,
  question_text text,
  marks int,
  question_type text check (question_type in ('mcq','short','long','case_based','assertion_reason')),
  topic_id uuid references topics(id),
  answer_text text,
  created_at timestamptz default now()
);

create table if not exists repeat_flags (
  id uuid primary key default gen_random_uuid(),
  question_id_1 uuid references questions(id) on delete cascade,
  question_id_2 uuid references questions(id) on delete cascade,
  similarity_score numeric(4,3),
  auto_detected boolean default true,
  admin_verdict text default 'pending' check (admin_verdict in ('pending','confirmed','dismissed')),
  reviewed_by uuid references user_accounts(id),
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  unique(question_id_1, question_id_2)
);

-- Enable row level security (use service key in API so RLS bypassed)
alter table user_accounts enable row level security;
alter table sessions enable row level security;
alter table papers enable row level security;
alter table topics enable row level security;
alter table questions enable row level security;
alter table repeat_flags enable row level security;
