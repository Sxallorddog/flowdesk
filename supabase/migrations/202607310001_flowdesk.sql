-- Optional Supabase deployment path. The hosted portfolio build uses D1.
create extension if not exists pgcrypto;

create type public.workspace_role as enum ('owner', 'admin', 'member');
create type public.deal_stage as enum ('new', 'contacted', 'proposal', 'negotiation', 'won', 'lost');
create type public.task_status as enum ('todo', 'in_progress', 'done');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.workspace_role not null default 'member',
  title text not null default 'Member',
  unique(workspace_id, user_id)
);
create table public.clients (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null, industry text not null default '', email text, phone text, status text not null default 'lead',
  owner_id uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.contacts (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade, name text not null, email text, phone text, position text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.deals (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id), title text not null, stage public.deal_stage not null default 'new',
  value integer not null default 0 check(value >= 0), probability integer not null default 20 check(probability between 0 and 100),
  owner_id uuid not null references public.profiles(id), source text not null default 'manual', next_action text, close_date date, loss_reason text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete set null, client_id uuid references public.clients(id) on delete set null,
  title text not null, status public.task_status not null default 'todo', priority text not null default 'medium',
  assignee_id uuid not null references public.profiles(id), due_date date not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.activities (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid not null references public.profiles(id), entity_type text not null, entity_id uuid not null,
  action text not null, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);

create index clients_workspace_name_idx on public.clients(workspace_id, name);
create index deals_workspace_stage_idx on public.deals(workspace_id, stage);
create index tasks_workspace_status_due_idx on public.tasks(workspace_id, status, due_date);
create index activities_workspace_entity_idx on public.activities(workspace_id, entity_type, entity_id);

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.members where workspace_id = target_workspace and user_id = auth.uid()) $$;

create or replace function public.has_workspace_role(target_workspace uuid, allowed public.workspace_role[])
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.members where workspace_id = target_workspace and user_id = auth.uid() and role = any(allowed)) $$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.members enable row level security;
alter table public.clients enable row level security;
alter table public.contacts enable row level security;
alter table public.deals enable row level security;
alter table public.tasks enable row level security;
alter table public.activities enable row level security;

create policy profiles_self_read on public.profiles for select using (id = auth.uid());
create policy workspaces_member_read on public.workspaces for select using (public.is_workspace_member(id));
create policy members_member_read on public.members for select using (public.is_workspace_member(workspace_id));
create policy members_admin_write on public.members for all using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[])) with check (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

create policy clients_workspace_access on public.clients for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy contacts_workspace_access on public.contacts for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy deals_workspace_access on public.deals for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy tasks_workspace_access on public.tasks for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy activities_workspace_read on public.activities for select using (public.is_workspace_member(workspace_id));
create policy activities_workspace_insert on public.activities for insert with check (public.is_workspace_member(workspace_id) and actor_id = auth.uid());

-- Role changes and workspace deletion must additionally go through a server action
-- that enforces Owner-only transitions; RLS prevents cross-workspace access.
