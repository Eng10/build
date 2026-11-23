import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { view } from '../src/ui/render.js';
import { setLang, t, dictionaries } from '../src/i18n/index.js';
import { makeState, AMOUNTS } from './fixtures.mjs';
import { paymentForm } from '../src/ui/views/payments.js';
import { stageForm, itemForm } from '../src/ui/views/stage.js';
import { contractorForm } from '../src/ui/views/contractors.js';
import { updateForm, issueForm } from '../src/ui/views/site.js';
import { inviteForm, memberForm, rolesSheet } from '../src/ui/views/team.js';
import { projectForm, switchSheet } from '../src/ui/views/projects.js';
import { profileForm } from '../src/ui/views/settings.js';
import { makeContext } from '../src/state/store.js';

const ROLES = ['admin', 'supervisor', 'user', 'contractor'];
const ROUTES = [
  { tab: 'home' }, { tab: 'contractors' }, { tab: 'reports' }, { tab: 'reports', period: '1m' }, { tab: 'reports', period: '6m' },
  { tab: 'site' }, { tab: 'site', site: 'visits' }, { tab: 'settings' },
  { tab: 'home', sub: 'stage', id: 's2' }, { tab: 'home', sub: 'payment', id: 'pay1' }, { tab: 'contractors', sub: 'contractor', id: 'k1' },
  { tab: 'site', sub: 'issue', id: 'is1' }, { tab: 'settings', sub: 'team' }, { tab: 'home', sub: 'notes' },
];
const render = (s) => { setLang(s.lang); return String(view(s)); };

test('كل الشاشات تُرسم لكل دور وكل لغة بدون أخطاء أو قيم فارغة', () => {
  for (const lang of ['ar', 'en']) for (const as of ROLES) for (const route of ROUTES) {
    const out = render(makeState({ as, lang, route }));
    assert.ok(out.length > 50, `${as}/${lang}/${JSON.stringify(route)} empty`);
    assert.ok(!/undefined|NaN|\[object|>null</.test(out), `${as}/${lang}/${JSON.stringify(route)} has bad token: ${out.match(/.{20}(undefined|NaN|\[object|>null<).{20}/)?.[0]}`);
  }
});

test('الحساب المخفي عنه التكاليف لا يرى أي مبلغ حتى لو وصلت البيانات بالخطأ (دفاع إضافي)', () => {
  for (const route of ROUTES) {
    const out = render(makeState({ as: 'contractor', leaky: true, route }));
    for (const a of AMOUNTS) assert.ok(!out.includes(a), `leak ${a} in ${JSON.stringify(route)}`);
    for (const raw of ['123456', '654321', '77777']) assert.ok(!out.includes(raw), `raw leak ${raw}`);
  }
});

test('المقاول بدون صلاحية التكاليف: لا تقارير ولا مرفقات حوالات ولا مساحة زيارات', () => {
  assert.ok(render(makeState({ as: 'contractor', route: { tab: 'reports' } })).includes('🔒'));
  const pay = render(makeState({ as: 'contractor', leaky: true, route: { tab: 'home', sub: 'payment', id: 'pay1' } }));
  assert.ok(!pay.includes('receipts'), 'receipt hidden');
  assert.ok(render(makeState({ as: 'contractor', route: { tab: 'site', site: 'visits' } })).includes('🔒'));
});

test('الواجهة تخفي أزرار التعديل حسب الصلاحية', () => {
  const has = (as, route, needle) => render(makeState({ as, route })).includes(needle);
  assert.ok(has('admin', { tab: 'home' }, 'data-act="pay-new"'));
  assert.ok(has('supervisor', { tab: 'home' }, 'data-act="stage-new"'));
  assert.ok(!has('user', { tab: 'home' }, 'data-act="pay-new"'), 'user cannot add payments');
  assert.ok(!has('user', { tab: 'home' }, 'data-act="stage-new"'));
  assert.ok(has('user', { tab: 'home' }, 'data-act="open"'), 'user can still browse');
  assert.ok(has('admin', { tab: 'settings', sub: 'team' }, 'data-act="member-new"'));
  assert.ok(!has('supervisor', { tab: 'settings', sub: 'team' }, 'data-act="member-new"'), 'supervisor cannot invite');
  assert.ok(!has('supervisor', { tab: 'settings', sub: 'team' }, 'data-act="member-edit"'));
  assert.ok(has('admin', { tab: 'settings', sub: 'team' }, 'data-act="member-edit"'));
  assert.ok(has('admin', { tab: 'settings' }, 'data-kind="project"'), 'owner can delete project');
  assert.ok(has('supervisor', { tab: 'settings' }, 'data-kind="leave"') && !has('supervisor', { tab: 'settings' }, 'data-kind="project"'));
});

test('حماية XSS: النصوص المدخلة تُهرَّب في كل مكان', () => {
  const evil = '<img src=x onerror=alert(1)>';
  const s = makeState({ nameOverride: evil });
  s.data.stages[1].name = evil; s.data.updates[0].title = evil; s.data.contractors[0].name = evil; s.data.members[1].profile.name = evil;
  for (const route of [{ tab: 'home' }, { tab: 'home', sub: 'stage', id: 's2' }, { tab: 'contractors' }, { tab: 'site' }, { tab: 'settings', sub: 'team' }]) {
    const out = render({ ...s, route: { ...s.route, ...route } });
    assert.ok(!out.includes('<img src=x'), `unescaped in ${JSON.stringify(route)}`);
  }
  assert.ok(render(s).includes('&lt;img src=x'));
});

test('النماذج والنوافذ تُرسم بدون أخطاء', () => {
  setLang('ar');
  const c = makeContext(makeState());
  const outs = [paymentForm(c, null, 's2'), paymentForm(c, c.d.payments[0]), stageForm(null), stageForm(c.d.stages[1]), itemForm(null, 's2'), itemForm(c.d.items[0]),
    contractorForm(null), contractorForm(c.d.contractors[0]), updateForm(null), updateForm(c.d.updates[0]), issueForm(c), inviteForm(c), memberForm(c, c.d.members[1]),
    rolesSheet(), projectForm(null), projectForm(c.project), switchSheet(c), profileForm({ name: 'A', phone: '050' })].map(String);
  outs.forEach((o, i) => assert.ok(o.length > 20 && !/undefined|NaN|\[object/.test(o), `form #${i}`));
  assert.ok(String(inviteForm(c)).includes('value="user"'), 'default invite role is the lowest');
  assert.ok(!String(inviteForm({ ...c, isOwner: false })).includes('value="admin"'), 'non-owner cannot invite admin');
  assert.match(String(memberForm({ ...c, isOwner: false }, c.d.members[1])), /name="manage"[^>]*disabled/, 'manage flag locked for non-owner');
});

test('العداد التلقائي: يظهر فقط عند وجود ميزانية', () => {
  const out = render(makeState({ route: { tab: 'home', sub: 'stage', id: 's3' } }));
  assert.ok(!out.includes('role="progressbar"'), 'no meter without budget');
  assert.ok(render(makeState({ route: { tab: 'home', sub: 'stage', id: 's2' } })).includes('role="progressbar"'));
});

test('حالات الدخول والتهيئة', () => {
  const base = makeState();
  assert.ok(render({ ...base, configured: false }).includes('.env'));
  assert.ok(render({ ...base, ready: false }).includes(t('loading')));
  const out = render({ ...base, session: null, user: null });
  assert.ok(out.includes('data-form="signin"') && !out.includes('data-id="u1"'), 'only login form without session');
  assert.ok(out.indexOf('My House') === -1, 'no project data before login');
  assert.ok(render({ ...base, session: null, user: null, route: { ...base.route, auth: 'up' } }).includes('data-form="signup"'));
  assert.ok(render({ ...base, recovery: true }).includes('data-form="recovery"'));
  const none = render({ ...base, projects: [], projectId: null, invites: [{ project_id: 'p9', project_name: 'Villa', role: 'user', invited_by_name: 'Sam' }] });
  assert.ok(none.includes('invite-accept') && none.includes('project-new'));
});

test('لا أثر للوضع التجريبي أو الحسابات الوهمية أو المفاتيح داخل الكود', () => {
  const files = [];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : files.push(path.join(d, e.name))));
  walk('src'); files.push('index.html');
  const bad = /تجريب|demo|mock|dummy|sample data|\b1234\b|quick.?login|eyJ[A-Za-z0-9_-]{20,}|supabase\.co/i;
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const m = src.match(bad);
    assert.ok(!m, `${f}: ${m?.[0]}`);
    if (!f.includes('i18n')) assert.ok(!/\b(password|passwd|pwd|secret)\s*[:=]\s*['"][^'"]+['"]/i.test(src), `${f}: hardcoded credential`);
    assert.ok(!/value="(admin|123|password)"/i.test(src), `${f}: autofill`);
  }
});

test('الترجمات: تطابق المفاتيح وكل مفتاح مستخدم موجود', () => {
  const ar = Object.keys(dictionaries.ar), en = Object.keys(dictionaries.en);
  assert.deepEqual(ar.filter((k) => !en.includes(k)), []); assert.deepEqual(en.filter((k) => !ar.includes(k)), []);
  const used = new Set();
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return walk(p);
    if (!p.endsWith('.js')) return;
    const src = fs.readFileSync(p, 'utf8');
    for (const m of src.matchAll(/\bt\('([a-z0-9_]+)'\)/g)) used.add(m[1]);
    for (const m of src.matchAll(/\bt\('([a-z_]+_)'\s*\+/g)) used.add(`${m[1]}*`);
  });
  const dynamic = {
    'role_*': ['admin', 'supervisor', 'user'], 'status_*': ['todo', 'doing', 'done'], 'kind_*': ['materials', 'labor', 'fees', 'other'], 'method_*': ['cash', 'transfer', 'check'],
    'period_*': ['all', '1m', '2m', '6m', '1y'], 'issue_*': ['open', 'in_progress', 'resolved'], 'tab_*': ['home', 'contractors', 'reports', 'site', 'settings'], 'stage_*': [...Array(10)].map((_, i) => String(i + 1)),
    'n_*': ['pay_new', 'pay_scheduled', 'pay_due', 'update_new', 'issue_new', 'issue_msg', 'invite', 'role_changed', 'removed', 'joined'],
    'err_*': ['invalid_credentials', 'weak_password', 'taken', 'email_exists', 'fill', 'forbidden', 'user_not_found', 'already_member', 'owner_locked', 'bad_role', 'cross_project', 'not_found', 'not_authenticated', 'duplicate', 'unknown', 'file_big', 'file_type', 'network', 'config_missing'],
  };
  const missing = [];
  for (const k of used) {
    if (k.endsWith('*')) { if (!dynamic[k]) missing.push(`dynamic ${k}`); else dynamic[k].forEach((s) => { if (!dictionaries.ar[k.slice(0, -1) + s]) missing.push(k.slice(0, -1) + s); }); }
    else if (!dictionaries.ar[k]) missing.push(k);
  }
  assert.deepEqual(missing, []);
});
