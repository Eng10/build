-- =====================================================================
-- مرفقات متعددة (صور / فيديو / PDF / مستندات) للتحديثات والملاحظات والردود
-- شغّله بعد 001_schema.sql: SQL Editor > New query > Run (مرة واحدة)
-- =====================================================================
create table public.attachments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  owner_kind  text not null check (owner_kind in ('update','issue','message')),
  owner_id    uuid not null,
  bucket      text not null check (bucket in ('updates','visits')),
  path        text not null check (char_length(path) <= 300),
  name        text not null check (char_length(name) between 1 and 160),
  mime        text not null,
  size        bigint check (size is null or size >= 0),
  created_by  uuid not null default auth.uid() references public.profiles(id),
  created_at  timestamptz not null default now()
);
create index on public.attachments (project_id, owner_kind, owner_id);
alter table public.attachments enable row level security;

-- القراءة: مرفقات التحديثات لكل الأعضاء، ومرفقات الزيارات والردود لمن يملك صلاحية الزيارات
create policy att_read on public.attachments for select to authenticated
  using (public.mflag(project_id, case bucket when 'updates' then 'member' else 'visits' end));
create policy att_ins on public.attachments for insert to authenticated
  with check (created_by = auth.uid() and public.mflag(project_id, case bucket when 'updates' then 'edit' else 'visits' end));
create policy att_del on public.attachments for delete to authenticated
  using (public.mflag(project_id, case bucket when 'updates' then 'edit' else 'visits' end)
         and (created_by = auth.uid() or public.mflag(project_id, 'manage')));

-- سلامة الربط: المالك من نفس المشروع، والحاوية تناسب النوع، والمسار داخل مجلد المشروع
create function public.enforce_attachment_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.path not like new.project_id::text || '/%' then raise exception 'cross_project'; end if;
  if new.owner_kind = 'update' then
    if new.bucket <> 'updates' or not exists (select 1 from project_updates where id = new.owner_id and project_id = new.project_id) then
      raise exception 'cross_project'; end if;
  elsif new.owner_kind = 'issue' then
    if new.bucket <> 'visits' or not exists (select 1 from issues where id = new.owner_id and project_id = new.project_id) then
      raise exception 'cross_project'; end if;
  else
    if new.bucket <> 'visits' or not exists (select 1 from issue_messages where id = new.owner_id and project_id = new.project_id) then
      raise exception 'cross_project'; end if;
  end if;
  return new;
end $$;
create trigger chk_attachments before insert on public.attachments
  for each row execute function public.enforce_attachment_owner();

-- حذف سجلات المرفقات تلقائياً عند حذف صاحبها (الملفات نفسها يحذفها التطبيق)
create function public.cleanup_attachments() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from attachments where owner_id = old.id
    and owner_kind = case tg_table_name when 'project_updates' then 'update' when 'issues' then 'issue' else 'message' end;
  return null;
end $$;
create trigger clean_att_updates after delete on public.project_updates for each row execute function public.cleanup_attachments();
create trigger clean_att_issues  after delete on public.issues          for each row execute function public.cleanup_attachments();
create trigger clean_att_msgs    after delete on public.issue_messages  for each row execute function public.cleanup_attachments();
create trigger ev_attachments after insert or update or delete on public.attachments
  for each row execute function public.touch_project();

-- الرد يجوز أن يكون مرفقات فقط بدون نص (التطبيق يشترط نصاً أو ملفاً)
alter table public.issue_messages drop constraint if exists issue_messages_check;

-- نقل الصور القديمة (عمود photo_path) إلى جدول المرفقات
insert into public.attachments (project_id, owner_kind, owner_id, bucket, path, name, mime, created_by)
select project_id, 'update', id, 'updates', photo_path, 'photo', case when photo_path ~* '\.png$' then 'image/png' when photo_path ~* '\.webp$' then 'image/webp' else 'image/jpeg' end, created_by
from public.project_updates where photo_path is not null;
insert into public.attachments (project_id, owner_kind, owner_id, bucket, path, name, mime, created_by)
select project_id, 'issue', id, 'visits', photo_path, 'photo', case when photo_path ~* '\.png$' then 'image/png' when photo_path ~* '\.webp$' then 'image/webp' else 'image/jpeg' end, created_by
from public.issues where photo_path is not null;
insert into public.attachments (project_id, owner_kind, owner_id, bucket, path, name, mime, created_by)
select project_id, 'message', id, 'visits', photo_path, 'photo', case when photo_path ~* '\.png$' then 'image/png' when photo_path ~* '\.webp$' then 'image/webp' else 'image/jpeg' end, created_by
from public.issue_messages where photo_path is not null;
update public.project_updates set photo_path = null where photo_path is not null;
update public.issues          set photo_path = null where photo_path is not null;
update public.issue_messages  set photo_path = null where photo_path is not null;

-- الفيديو أكبر من الصور: الحد 50 ميجا (الحد الأقصى للخطة المجانية في Supabase)
update storage.buckets set file_size_limit = 52428800 where id in ('updates', 'visits');

revoke all on public.attachments from anon;
revoke execute on function public.enforce_attachment_owner() from public, anon;
revoke execute on function public.cleanup_attachments() from public, anon;
grant select, insert, delete on public.attachments to authenticated;
