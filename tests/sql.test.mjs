import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync('supabase/migrations/001_schema.sql', 'utf8');

// فحص بنيوي مبدئي فقط (ليس بديلاً عن تشغيل الملف على Supabase فعلياً)
test('كل جدول في public مفعّل عليه RLS', () => {
  const tables = [...sql.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]);
  assert.ok(tables.length >= 12);
  for (const t of tables) assert.match(sql, new RegExp(`alter table public\\.${t}\\s+enable row level security`), `RLS missing on ${t}`);
});

test('الأقواس وعلامات $$ متوازنة', () => {
  assert.equal((sql.match(/\$\$/g) || []).length % 2, 0);
  const noStrings = sql.replace(/'(?:[^']|'')*'/g, "''").replace(/--.*$/gm, '');
  assert.equal((noStrings.match(/\(/g) || []).length, (noStrings.match(/\)/g) || []).length);
});

test('الجداول الحساسة لا تُقرأ إلا بصلاحية التكاليف، والعروض تخفي الأرقام', () => {
  for (const t of ['payments', 'stages', 'items', 'contractors']) {
    assert.match(sql, new RegExp(`${t === 'payments' ? 'pay_read on public\\.payments' : `%1\\$s_read on public\\.%1\\$s`}[^;]*mflag\\(project_id,\\s*'?'?costs`));
  }
  assert.match(sql, /create view public\.v_stages[\s\S]*case when public\.mflag\(s\.project_id,'costs'\) then s\.budget end/);
  assert.match(sql, /create view public\.v_contractors[\s\S]*contract_value/);
  assert.doesNotMatch(sql, /grant[^;]*anon/i.source === '' ? /$^/ : /grant select[^;]*to anon/);
});

test('الأعضاء لا يعدَّلون إلا عبر دوال الخادم', () => {
  assert.doesNotMatch(sql, /create policy \w+ on public\.project_members for (insert|update|delete|all)/);
  for (const fn of ['invite_member', 'respond_invite', 'update_member', 'remove_member', 'leave_project', 'create_project']) assert.match(sql, new RegExp(`create function public\\.${fn}`));
  assert.match(sql, /owner_locked/);
});

test('سياسات التخزين تغطي المجلدات الأربعة', () => {
  for (const b of ['receipts', 'contracts', 'updates', 'visits']) assert.match(sql, new RegExp(`\\('${b}','`));
});

const att = fs.readFileSync('supabase/migrations/002_attachments.sql', 'utf8');
test('مرفقات 002: RLS وحدود الصلاحيات وسلامة الربط والترحيل', () => {
  assert.match(att, /alter table public\.attachments enable row level security/);
  assert.match(att, /create policy att_read[\s\S]*'member' else 'visits'/);
  assert.match(att, /create policy att_ins[\s\S]*created_by = auth\.uid\(\)/);
  assert.match(att, /create trigger chk_attachments before insert/);
  assert.match(att, /new\.path not like new\.project_id::text/);
  for (const t of ['project_updates', 'issues', 'issue_messages']) assert.match(att, new RegExp(`after delete on public\\.${t}`));
  assert.match(att, /drop constraint if exists issue_messages_check/);
  assert.match(att, /file_size_limit = 52428800/);
  assert.equal((att.match(/\$\$/g) || []).length % 2, 0);
  assert.doesNotMatch(att, /grant[^;]*anon/);
  const noStrings = att.replace(/'(?:[^']|'')*'/g, "''").replace(/--.*$/gm, '');
  assert.equal((noStrings.match(/\(/g) || []).length, (noStrings.match(/\)/g) || []).length);
});