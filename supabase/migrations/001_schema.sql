-- =====================================================================
-- Build Ledger — قاعدة البيانات الكاملة (Supabase / PostgreSQL)
-- شغّل هذا الملف مرة واحدة في: Supabase Dashboard > SQL Editor > New query
-- =====================================================================
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  username    text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  phone       text unique check (phone is null or phone ~ '^[0-9+]{8,16}$'),
  lang        text not null default 'ar'   check (lang  in ('ar','en')),
  theme       text not null default 'auto' check (theme in ('auto','light','dark')),
  notify      jsonb not null default '{"upd":true,"pay":true,"vis":true,"due":true}',
  created_at  timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, username, phone)
  values (new.id,
          trim(coalesce(new.raw_user_meta_data->>'name','')),
          lower(trim(coalesce(new.raw_user_meta_data->>'username',''))),
          nullif(trim(coalesce(new.raw_user_meta_data->>'phone','')),''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- projects
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 120),
  budget      numeric(14,2) not null default 0 check (budget >= 0),
  start_date  date,
  end_date    date,
  created_by  uuid not null references public.profiles(id),
  created_at  timestamptz not null default now()
);

-- أدوار المشروع: admin (مسؤول) / supervisor (مشرف) / user (مستخدم) + أعلام صلاحيات مستقلة
create table public.project_members (
  project_id    uuid not null references public.projects(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  role          text not null default 'user' check (role in ('admin','supervisor','user')),
  title         text,
  can_costs     boolean not null default true,
  can_edit      boolean not null default false,
  can_visits    boolean not null default false,
  can_manage    boolean not null default false,
  contractor_id uuid,
  status        text not null default 'pending' check (status in ('pending','active')),
  invited_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index on public.project_members (user_id, status);

create table public.stages (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  start_date  date,
  end_date    date,
  status      text not null default 'todo' check (status in ('todo','doing','done')),
  done_on     date,
  budget      numeric(14,2) not null default 0 check (budget >= 0),
  position    int not null default 0,
  created_at  timestamptz not null default now()
);
create index on public.stages (project_id, position);

create table public.items (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  stage_id    uuid not null references public.stages(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  budget      numeric(14,2) not null default 0 check (budget >= 0),
  created_at  timestamptz not null default now()
);
create index on public.items (stage_id);

create table public.contractors (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 120),
  trade          text,
  phone          text,
  scope          text[] not null default '{}',
  contract_value numeric(14,2) not null default 0 check (contract_value >= 0),
  start_date     date,
  end_date       date,
  contract_path  text,
  created_at     timestamptz not null default now()
);
create index on public.contractors (project_id);
alter table public.project_members
  add constraint project_members_contractor_fk foreign key (contractor_id)
  references public.contractors(id) on delete set null;

create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  stage_id      uuid not null references public.stages(id) on delete cascade,
  item_id       uuid references public.items(id) on delete set null,
  contractor_id uuid references public.contractors(id) on delete set null,
  amount        numeric(14,2) not null check (amount > 0),
  kind          text not null default 'materials' check (kind in ('materials','labor','fees','other')),
  method        text not null default 'transfer'  check (method in ('cash','transfer','check')),
  payee         text,
  invoice_no    text,
  vat_rate      numeric(4,2) not null default 0 check (vat_rate between 0 and 100),
  status        text not null default 'paid' check (status in ('paid','scheduled')),
  paid_on       date not null default current_date,
  note          text,
  receipt_path  text,
  created_by    uuid not null default auth.uid() references public.profiles(id),
  created_at    timestamptz not null default now()
);
create index on public.payments (project_id, paid_on desc);
create index on public.payments (stage_id);

create table public.project_updates (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 160),
  body        text not null default '',
  posted_on   date not null default current_date,
  photo_path  text,
  created_by  uuid not null default auth.uid() references public.profiles(id),
  created_at  timestamptz not null default now()
);
create index on public.project_updates (project_id, posted_on desc);

create table public.issues (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  stage_id    uuid references public.stages(id) on delete set null,
  title       text not null check (char_length(title) between 1 and 160),
  description text not null default '',
  status      text not null default 'open' check (status in ('open','in_progress','resolved')),
  photo_path  text,
  created_by  uuid not null default auth.uid() references public.profiles(id),
  created_at  timestamptz not null default now()
);
create index on public.issues (project_id, created_at desc);

create table public.issue_messages (
  id          uuid primary key default gen_random_uuid(),
  issue_id    uuid not null references public.issues(id) on delete cascade,
  project_id  uuid not null references public.projects(id) on delete cascade,
  body        text not null default '',
  photo_path  text,
  created_by  uuid not null default auth.uid() references public.profiles(id),
  created_at  timestamptz not null default now(),
  check (char_length(body) > 0 or photo_path is not null)
);
create index on public.issue_messages (issue_id, created_at);

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  project_id  uuid,
  kind        text not null,
  data        jsonb not null default '{}',
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index on public.notifications (user_id, read, created_at desc);

-- إشارات المزامنة اللحظية: لا تحمل أي بيانات، فقط تنبّه الأجهزة لإعادة التحميل
create table public.project_events (
  project_id uuid not null,
  source     text not null,
  at         timestamptz not null default now(),
  primary key (project_id, source)
);

-- ------------------------------------------------------------ helper funcs
create function public.mflag(pid uuid, flag text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case flag
      when 'member' then true
      when 'costs'  then can_costs
      when 'edit'   then can_edit
      when 'visits' then can_visits
      when 'manage' then can_manage
      else false end
    from public.project_members
    where project_id = pid and user_id = auth.uid() and status = 'active'), false)
$$;

create function public.my_contractor(pid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select contractor_id from public.project_members
  where project_id = pid and user_id = auth.uid() and status = 'active'
$$;

create function public.shares_project(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.project_members a
    join public.project_members b on a.project_id = b.project_id
    where a.user_id = auth.uid() and a.status = 'active' and b.user_id = uid)
$$;

create function public.stage_progress(sid uuid) returns int
language sql stable security definer set search_path = public as $$
  select case
    when s.status = 'done' then 100
    when s.budget > 0 then least(100, round(coalesce((select sum(amount) from public.payments
           where stage_id = s.id and status = 'paid'), 0) / s.budget * 100))::int
    end
  from public.stages s where s.id = sid
$$;

create function public.project_progress(pid uuid) returns int
language sql stable security definer set search_path = public as $$
  select case
    when p.budget > 0 then least(100, round(coalesce((select sum(amount) from public.payments
           where project_id = pid and status = 'paid'), 0) / p.budget * 100))::int
    else (select round(avg(public.stage_progress(s.id)))::int from public.stages s
          where s.project_id = pid and public.stage_progress(s.id) is not null)
    end
  from public.projects p where p.id = pid
$$;

-- ----------------------------------------------------------------- views
-- الأرقام المالية تُخفى على مستوى قاعدة البيانات لمن لا يملك صلاحية التكاليف
create view public.v_projects as
  select p.id, p.name, p.start_date, p.end_date, p.created_by, p.created_at,
         case when public.mflag(p.id,'costs') then p.budget end as budget,
         public.mflag(p.id,'costs') as costs_visible,
         public.project_progress(p.id) as progress
  from public.projects p where public.mflag(p.id,'member');

create view public.v_stages as
  select s.id, s.project_id, s.name, s.start_date, s.end_date, s.status, s.done_on, s.position,
         case when public.mflag(s.project_id,'costs') then s.budget end as budget,
         public.stage_progress(s.id) as progress
  from public.stages s where public.mflag(s.project_id,'member');

create view public.v_items as
  select i.id, i.project_id, i.stage_id, i.name,
         case when public.mflag(i.project_id,'costs') then i.budget end as budget
  from public.items i where public.mflag(i.project_id,'member');

create view public.v_contractors as
  select c.id, c.project_id, c.name, c.trade, c.phone, c.scope, c.start_date, c.end_date,
         case when public.mflag(c.project_id,'costs') then c.contract_value end as contract_value,
         case when public.mflag(c.project_id,'costs') or c.id = public.my_contractor(c.project_id)
              then c.contract_path end as contract_path
  from public.contractors c
  where public.mflag(c.project_id,'member')
    and (public.mflag(c.project_id,'costs')
         or public.my_contractor(c.project_id) is null
         or c.id = public.my_contractor(c.project_id));

create view public.v_my_invites as
  select m.project_id, p.name as project_name, m.role, m.title, pr.name as invited_by_name, m.created_at
  from public.project_members m
  join public.projects p on p.id = m.project_id
  left join public.profiles pr on pr.id = m.invited_by
  where m.user_id = auth.uid() and m.status = 'pending';

-- ------------------------------------------------------- integrity triggers
create function public.enforce_same_project() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'items' then
    if not exists (select 1 from stages where id = new.stage_id and project_id = new.project_id) then
      raise exception 'cross_project'; end if;
  elsif tg_table_name = 'payments' then
    if not exists (select 1 from stages where id = new.stage_id and project_id = new.project_id) then
      raise exception 'cross_project'; end if;
    if new.item_id is not null and not exists (select 1 from items where id = new.item_id and project_id = new.project_id) then
      raise exception 'cross_project'; end if;
    if new.contractor_id is not null and not exists (select 1 from contractors where id = new.contractor_id and project_id = new.project_id) then
      raise exception 'cross_project'; end if;
  elsif tg_table_name = 'issues' then
    if new.stage_id is not null and not exists (select 1 from stages where id = new.stage_id and project_id = new.project_id) then
      raise exception 'cross_project'; end if;
  elsif tg_table_name = 'issue_messages' then
    if not exists (select 1 from issues where id = new.issue_id and project_id = new.project_id) then
      raise exception 'cross_project'; end if;
  end if;
  return new;
end $$;
create trigger chk_items    before insert or update on public.items          for each row execute function public.enforce_same_project();
create trigger chk_payments before insert or update on public.payments       for each row execute function public.enforce_same_project();
create trigger chk_issues   before insert or update on public.issues         for each row execute function public.enforce_same_project();
create trigger chk_msgs     before insert or update on public.issue_messages for each row execute function public.enforce_same_project();

create function public.stage_done_date() returns trigger language plpgsql as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then new.done_on := coalesce(new.done_on, current_date);
  elsif new.status <> 'done' then new.done_on := null; end if;
  return new;
end $$;
create trigger stage_done before insert or update on public.stages for each row execute function public.stage_done_date();

create function public.stage_auto_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'paid' then
    update stages set status = 'doing' where id = new.stage_id and status = 'todo';
  end if;
  return new;
end $$;
create trigger pay_auto_status after insert or update of status on public.payments
  for each row execute function public.stage_auto_status();

-- ------------------------------------------------------ realtime signals
create function public.touch_project() returns trigger
language plpgsql security definer set search_path = public as $$
declare k text := case tg_table_name when 'projects' then 'id' else 'project_id' end; pid uuid;
begin
  pid := coalesce(to_jsonb(new)->>k, to_jsonb(old)->>k)::uuid;
  insert into project_events (project_id, source, at) values (pid, tg_table_name, now())
  on conflict (project_id, source) do update set at = excluded.at;
  return null;
end $$;
do $$ declare t text; begin
  foreach t in array array['projects','project_members','stages','items','contractors','payments','project_updates','issues','issue_messages'] loop
    execute format('create trigger ev_%1$s after insert or update or delete on public.%1$s for each row execute function public.touch_project()', t);
  end loop; end $$;

-- --------------------------------------------------------- notifications
create function public.notify_members(pid uuid, flag text, pref text, k text, d jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, project_id, kind, data)
  select m.user_id, pid, k, d
  from project_members m join profiles p on p.id = m.user_id
  where m.project_id = pid and m.status = 'active'
    and m.user_id is distinct from auth.uid()
    and (flag = 'member'
         or (flag = 'costs'  and m.can_costs)  or (flag = 'visits' and m.can_visits)
         or (flag = 'manage' and m.can_manage) or (flag = 'edit'   and m.can_edit))
    and coalesce((p.notify->>pref)::boolean, true);
end $$;

create function public.trg_notify_payment() returns trigger
language plpgsql security definer set search_path = public as $$
declare sname text;
begin
  select name into sname from stages where id = new.stage_id;
  if tg_op = 'INSERT' or (old.status = 'scheduled' and new.status = 'paid') then
    perform notify_members(new.project_id, 'costs', 'pay',
      case when new.status = 'scheduled' then 'pay_scheduled' else 'pay_new' end,
      jsonb_build_object('amount', new.amount, 'stage', sname, 'due', new.paid_on));
  end if;
  return null;
end $$;
create trigger notify_payment after insert or update of status on public.payments
  for each row execute function public.trg_notify_payment();

create function public.trg_notify_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform notify_members(new.project_id, 'member', 'upd', 'update_new', jsonb_build_object('title', new.title));
  return null;
end $$;
create trigger notify_update after insert on public.project_updates
  for each row execute function public.trg_notify_update();

create function public.trg_notify_issue() returns trigger
language plpgsql security definer set search_path = public as $$
declare t text;
begin
  if tg_table_name = 'issues' then
    perform notify_members(new.project_id, 'visits', 'vis', 'issue_new', jsonb_build_object('title', new.title));
  else
    select title into t from issues where id = new.issue_id;
    perform notify_members(new.project_id, 'visits', 'vis', 'issue_msg', jsonb_build_object('title', t, 'issue', new.issue_id));
  end if;
  return null;
end $$;
create trigger notify_issue after insert on public.issues         for each row execute function public.trg_notify_issue();
create trigger notify_msg   after insert on public.issue_messages for each row execute function public.trg_notify_issue();

create function public.trg_notify_member() returns trigger
language plpgsql security definer set search_path = public as $$
declare pname text; uname text;
begin
  if tg_op = 'DELETE' then
    select name into pname from projects where id = old.project_id;
    if pname is not null and old.user_id is distinct from auth.uid() then
      insert into notifications (user_id, project_id, kind, data)
      values (old.user_id, old.project_id, 'removed', jsonb_build_object('project', pname));
    end if;
    return null;
  end if;
  select name into pname from projects where id = new.project_id;
  select name into uname from profiles where id = new.user_id;
  if tg_op = 'INSERT' then
    if new.status = 'pending' then
      insert into notifications (user_id, project_id, kind, data)
      values (new.user_id, new.project_id, 'invite', jsonb_build_object('project', pname, 'role', new.role));
    end if;
  elsif old.status = 'pending' and new.status = 'active' then
    perform notify_members(new.project_id, 'manage', 'upd', 'joined', jsonb_build_object('user', uname, 'project', pname));
  elsif new.status = 'active' and (old.role, old.can_costs, old.can_edit, old.can_visits, old.can_manage, old.title)
        is distinct from (new.role, new.can_costs, new.can_edit, new.can_visits, new.can_manage, new.title) then
    insert into notifications (user_id, project_id, kind, data)
    values (new.user_id, new.project_id, 'role_changed', jsonb_build_object('project', pname, 'role', new.role));
  end if;
  return null;
end $$;
create trigger notify_member after insert or update or delete on public.project_members
  for each row execute function public.trg_notify_member();

-- تنبيه الدفعات المجدولة القريبة (يُشغَّل يومياً عبر pg_cron أو Edge Function، راجع README)
create function public.notify_due_payments() returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select pay.id, pay.project_id, pay.amount, pay.paid_on, s.name as sname
           from payments pay join stages s on s.id = pay.stage_id
           where pay.status = 'scheduled' and pay.paid_on <= current_date + 3
             and not exists (select 1 from notifications x where x.kind = 'pay_due'
                             and x.data->>'payment' = pay.id::text and x.created_at::date = current_date)
  loop
    insert into notifications (user_id, project_id, kind, data)
    select m.user_id, r.project_id, 'pay_due',
           jsonb_build_object('amount', r.amount, 'stage', r.sname, 'due', r.paid_on, 'payment', r.id)
    from project_members m join profiles p on p.id = m.user_id
    where m.project_id = r.project_id and m.status = 'active' and m.can_costs
      and coalesce((p.notify->>'due')::boolean, true);
    n := n + 1;
  end loop;
  return n;
end $$;

-- ------------------------------------------------------------ RPC (الإدارة)
create function public.is_handle_free(p_username text, p_phone text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from profiles where username = lower(trim(p_username))
                     or (nullif(trim(p_phone),'') is not null and phone = trim(p_phone)))
$$;

create function public.create_project(p_name text, p_budget numeric, p_start date, p_end date, p_stages text[])
returns uuid language plpgsql security definer set search_path = public as $$
declare pid uuid; s text; i int := 0;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  insert into projects (name, budget, start_date, end_date, created_by)
  values (trim(p_name), coalesce(p_budget,0), p_start, p_end, auth.uid()) returning id into pid;
  insert into project_members (project_id, user_id, role, can_costs, can_edit, can_visits, can_manage, status)
  values (pid, auth.uid(), 'admin', true, true, true, true, 'active');
  foreach s in array coalesce(p_stages, '{}') loop
    i := i + 1; insert into stages (project_id, name, position) values (pid, s, i);
  end loop;
  return pid;
end $$;

create function public.invite_member(p_project uuid, p_identifier text, p_role text) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid; owner uuid; ident text := regexp_replace(lower(trim(p_identifier)), '^@', '');
begin
  if not mflag(p_project, 'manage') then raise exception 'forbidden'; end if;
  if p_role not in ('admin','supervisor','user') then raise exception 'bad_role'; end if;
  select created_by into owner from projects where id = p_project;
  if p_role = 'admin' and owner <> auth.uid() then raise exception 'forbidden'; end if;
  select id into uid from profiles where username = ident or phone = regexp_replace(ident, '\s', '', 'g') limit 1;
  if uid is null then raise exception 'user_not_found'; end if;
  if exists (select 1 from project_members where project_id = p_project and user_id = uid) then raise exception 'already_member'; end if;
  insert into project_members (project_id, user_id, role, can_costs, can_edit, can_visits, can_manage, status, invited_by)
  values (p_project, uid, p_role, true, p_role <> 'user', p_role <> 'user', p_role = 'admin', 'pending', auth.uid());
end $$;

create function public.respond_invite(p_project uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from project_members where project_id = p_project and user_id = auth.uid() and status = 'pending') then
    raise exception 'not_found'; end if;
  if p_accept then update project_members set status = 'active' where project_id = p_project and user_id = auth.uid();
  else delete from project_members where project_id = p_project and user_id = auth.uid() and status = 'pending'; end if;
end $$;

create function public.update_member(p_project uuid, p_user uuid, p_role text, p_title text,
  p_costs boolean, p_edit boolean, p_visits boolean, p_manage boolean, p_contractor uuid) returns void
language plpgsql security definer set search_path = public as $$
declare owner uuid; tgt project_members;
begin
  if not mflag(p_project, 'manage') then raise exception 'forbidden'; end if;
  if p_role not in ('admin','supervisor','user') then raise exception 'bad_role'; end if;
  select created_by into owner from projects where id = p_project;
  if p_user = owner then raise exception 'owner_locked'; end if;
  select * into tgt from project_members where project_id = p_project and user_id = p_user;
  if not found then raise exception 'not_found'; end if;
  if auth.uid() <> owner and (p_role = 'admin' or tgt.role = 'admin' or p_manage is distinct from tgt.can_manage) then
    raise exception 'forbidden'; end if;
  if p_contractor is not null and not exists (select 1 from contractors where id = p_contractor and project_id = p_project) then
    raise exception 'cross_project'; end if;
  update project_members set role = p_role, title = nullif(trim(p_title), ''), can_costs = p_costs, can_edit = p_edit,
         can_visits = p_visits, can_manage = p_manage, contractor_id = p_contractor
  where project_id = p_project and user_id = p_user;
end $$;

create function public.remove_member(p_project uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare owner uuid; tgt project_members;
begin
  if not mflag(p_project, 'manage') then raise exception 'forbidden'; end if;
  select created_by into owner from projects where id = p_project;
  if p_user = owner then raise exception 'owner_locked'; end if;
  select * into tgt from project_members where project_id = p_project and user_id = p_user;
  if not found then raise exception 'not_found'; end if;
  if auth.uid() <> owner and (tgt.can_manage or tgt.role = 'admin') then raise exception 'forbidden'; end if;
  delete from project_members where project_id = p_project and user_id = p_user;
end $$;

create function public.leave_project(p_project uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from projects where id = p_project and created_by = auth.uid()) then raise exception 'owner_locked'; end if;
  delete from project_members where project_id = p_project and user_id = auth.uid();
end $$;

-- ------------------------------------------------- Row Level Security
alter table public.profiles        enable row level security;
alter table public.projects        enable row level security;
alter table public.project_members enable row level security;
alter table public.stages          enable row level security;
alter table public.items           enable row level security;
alter table public.contractors     enable row level security;
alter table public.payments        enable row level security;
alter table public.project_updates enable row level security;
alter table public.issues          enable row level security;
alter table public.issue_messages  enable row level security;
alter table public.notifications   enable row level security;
alter table public.project_events  enable row level security;

create policy profiles_read   on public.profiles for select to authenticated using (id = auth.uid() or public.shares_project(id));
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy projects_read   on public.projects for select to authenticated using (public.mflag(id,'costs'));
create policy projects_update on public.projects for update to authenticated using (public.mflag(id,'manage')) with check (public.mflag(id,'manage'));
create policy projects_delete on public.projects for delete to authenticated using (created_by = auth.uid());

create policy members_read on public.project_members for select to authenticated
  using (user_id = auth.uid() or public.mflag(project_id,'member'));

do $$ declare t text; begin
  foreach t in array array['stages','items','contractors'] loop
    execute format('create policy %1$s_read on public.%1$s for select to authenticated using (public.mflag(project_id,''costs''))', t);
    execute format('create policy %1$s_ins  on public.%1$s for insert to authenticated with check (public.mflag(project_id,''edit''))', t);
    execute format('create policy %1$s_upd  on public.%1$s for update to authenticated using (public.mflag(project_id,''edit'')) with check (public.mflag(project_id,''edit''))', t);
    execute format('create policy %1$s_del  on public.%1$s for delete to authenticated using (public.mflag(project_id,''edit''))', t);
  end loop; end $$;

create policy pay_read on public.payments for select to authenticated using (public.mflag(project_id,'costs'));
create policy pay_ins  on public.payments for insert to authenticated with check (public.mflag(project_id,'edit') and created_by = auth.uid());
create policy pay_upd  on public.payments for update to authenticated using (public.mflag(project_id,'edit')) with check (public.mflag(project_id,'edit'));
create policy pay_del  on public.payments for delete to authenticated using (public.mflag(project_id,'edit'));

create policy upd_read on public.project_updates for select to authenticated using (public.mflag(project_id,'member'));
create policy upd_ins  on public.project_updates for insert to authenticated with check (public.mflag(project_id,'edit') and created_by = auth.uid());
create policy upd_upd  on public.project_updates for update to authenticated
  using (public.mflag(project_id,'edit') and (created_by = auth.uid() or public.mflag(project_id,'manage')));
create policy upd_del  on public.project_updates for delete to authenticated
  using (public.mflag(project_id,'edit') and (created_by = auth.uid() or public.mflag(project_id,'manage')));

create policy iss_read on public.issues for select to authenticated using (public.mflag(project_id,'visits'));
create policy iss_ins  on public.issues for insert to authenticated with check (public.mflag(project_id,'visits') and created_by = auth.uid());
create policy iss_upd  on public.issues for update to authenticated using (public.mflag(project_id,'edit')) with check (public.mflag(project_id,'edit'));
create policy iss_del  on public.issues for delete to authenticated using (public.mflag(project_id,'manage'));

create policy msg_read on public.issue_messages for select to authenticated using (public.mflag(project_id,'visits'));
create policy msg_ins  on public.issue_messages for insert to authenticated with check (public.mflag(project_id,'visits') and created_by = auth.uid());

create policy notes_read   on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notes_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notes_delete on public.notifications for delete to authenticated using (user_id = auth.uid());

create policy events_read on public.project_events for select to authenticated using (public.mflag(project_id,'member'));

-- ------------------------------------------------------------- Storage
insert into storage.buckets (id, name, public, file_size_limit) values
  ('receipts',  'receipts',  false, 10485760),
  ('contracts', 'contracts', false, 10485760),
  ('updates',   'updates',   false, 10485760),
  ('visits',    'visits',    false, 10485760)
on conflict (id) do nothing;

-- المسار: <project_id>/<ملف> — القراءة والكتابة تتبع صلاحيات المشروع
do $$ declare r record; begin
  for r in select * from (values ('receipts','costs','edit'),('contracts','costs','edit'),('updates','member','edit'),('visits','visits','visits')) v(b, rf, wf) loop
    execute format('create policy "%1$s_read" on storage.objects for select to authenticated using (bucket_id = %1$L and public.mflag(((storage.foldername(name))[1])::uuid, %2$L))', r.b, r.rf);
    execute format('create policy "%1$s_write" on storage.objects for insert to authenticated with check (bucket_id = %1$L and public.mflag(((storage.foldername(name))[1])::uuid, %3$L))', r.b, r.rf, r.wf);
    execute format('create policy "%1$s_remove" on storage.objects for delete to authenticated using (bucket_id = %1$L and public.mflag(((storage.foldername(name))[1])::uuid, %3$L))', r.b, r.rf, r.wf);
  end loop; end $$;

-- ------------------------------------------------------ Grants & Realtime
revoke all on all tables    in schema public from anon;
revoke all on all functions in schema public from public, anon;
grant usage on schema public to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, update, delete on public.projects to authenticated;
grant select on public.project_members to authenticated;
grant select, insert, update, delete on public.stages, public.items, public.contractors, public.payments, public.project_updates to authenticated;
grant select, insert, update, delete on public.issues to authenticated;
grant select, insert on public.issue_messages to authenticated;
grant select, update, delete on public.notifications to authenticated;
grant select on public.project_events to authenticated;
grant select on public.v_projects, public.v_stages, public.v_items, public.v_contractors, public.v_my_invites to authenticated;
grant execute on all functions in schema public to authenticated;
revoke execute on function public.notify_due_payments() from authenticated;
grant execute on function public.is_handle_free(text, text) to anon, authenticated;

alter publication supabase_realtime add table public.project_events, public.notifications;

-- اختياري: تنبيه الدفعات المجدولة يومياً (يتطلب تفعيل إضافة pg_cron من Database > Extensions)
-- select cron.schedule('due-payments', '0 6 * * *', $$select public.notify_due_payments()$$);
