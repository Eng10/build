import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNum, normalizePhone, normalizeUsername, identifierOf, money, isValidUsername, isValidPhone } from '../src/domain/format.js';
import { capsOf, canManageTarget, assignableRoles, PRESETS, ROLES } from '../src/domain/permissions.js';
import { filterPeriod, groupSum, summary, monthly, upcoming, timeline, sumAmount } from '../src/domain/reports.js';
import { addDays, daysBetween } from '../src/domain/dates.js';

test('parseNum يقبل الأرقام العربية والفواصل ويرفض النصوص', () => {
  assert.equal(parseNum('٥٠٠٠'), 5000);
  assert.equal(parseNum('1,250,000'), 1250000);
  assert.equal(parseNum('١٢٫٥'), 12.5);
  assert.equal(parseNum('abc'), null);
  assert.equal(parseNum(''), null);
});

test('تطبيع الجوال واليوزر ومعرّف الدعوة', () => {
  assert.equal(normalizePhone('+966 50 123 4567'), '0501234567');
  assert.equal(normalizePhone('٠٥٠١٢٣٤٥٦٧'), '0501234567');
  assert.equal(normalizeUsername(' @Ahmed_1 '), 'ahmed_1');
  assert.equal(identifierOf('0501234567'), '0501234567');
  assert.equal(identifierOf('@Ahmed'), 'ahmed');
  assert.ok(isValidUsername('abc_12') && !isValidUsername('ab') && !isValidUsername('Abc'));
  assert.ok(isValidPhone('0501234567') && !isValidPhone('12'));
});

test('money يخفي القيم عند الإخفاء أو غياب القيمة', () => {
  assert.equal(money(1234567), '1,234,567');
  assert.equal(money(null), '•••');
  assert.equal(money(5, { hidden: true }), '•••');
});

test('capsOf: العضو غير النشط لا يملك أي صلاحية', () => {
  const m = { status: 'pending', can_costs: true, can_edit: true, can_visits: true, can_manage: true };
  assert.deepEqual(capsOf(m), { member: false, costs: false, edit: false, visits: false, manage: false });
  assert.equal(capsOf({ ...m, status: 'active' }).manage, true);
  assert.equal(capsOf(null).member, false);
});

test('قواعد إدارة الأعضاء تطابق الخادم', () => {
  const owner = 'u1';
  const adminCaps = capsOf({ status: 'active', can_manage: true });
  const base = { caps: adminCaps, ownerId: owner };
  assert.equal(canManageTarget({ ...base, isOwner: true, target: { user_id: 'u1', role: 'admin' } }), false, 'المالك محمي');
  assert.equal(canManageTarget({ ...base, isOwner: true, target: { user_id: 'u9', role: 'admin', can_manage: true } }), true);
  assert.equal(canManageTarget({ ...base, isOwner: false, target: { user_id: 'u9', role: 'admin', can_manage: true } }), false);
  assert.equal(canManageTarget({ ...base, isOwner: false, target: { user_id: 'u9', role: 'user', can_manage: false } }), true);
  assert.equal(canManageTarget({ caps: capsOf({ status: 'active' }), isOwner: false, ownerId: owner, target: { user_id: 'u9', role: 'user' } }), false);
  assert.deepEqual(assignableRoles(false), ['supervisor', 'user']);
  assert.deepEqual(assignableRoles(true), ROLES);
  assert.equal(PRESETS.user.edit, false);
  assert.equal(PRESETS.admin.manage, true);
});

test('التقارير: الفترات والتجميع والملخص', () => {
  const today = '2026-11-22';
  const rows = [
    { amount: 100, paid_on: '2026-11-10', status: 'paid', stage_id: 'a' },
    { amount: 200, paid_on: '2026-09-30', status: 'paid', stage_id: 'a' },
    { amount: 400, paid_on: '2025-01-01', status: 'paid', stage_id: 'b' },
    { amount: 999, paid_on: '2026-11-20', status: 'scheduled', stage_id: 'b' },
  ];
  assert.equal(filterPeriod(rows, 'all', today).length, 3, 'المجدولة لا تُحسب');
  assert.equal(sumAmount(filterPeriod(rows, '1m', today)), 100);
  assert.equal(sumAmount(filterPeriod(rows, '2m', today)), 300);
  assert.equal(sumAmount(filterPeriod(rows, '1y', today)), 300);
  assert.deepEqual(groupSum(rows.slice(0, 3), (r) => r.stage_id).sort(), [['a', 300], ['b', 400]]);
  const s = summary(rows.slice(0, 3), 1400);
  assert.equal(s.total, 700); assert.equal(s.count, 3); assert.equal(s.max, 400); assert.equal(Math.round(s.share), 50);
  assert.equal(summary([], 0).share, null);
  assert.deepEqual(monthly(rows.slice(0, 2)).map((m) => m[0]), ['2026-09', '2026-11']);
  assert.equal(upcoming(rows).length, 1);
  assert.equal(timeline({ start_date: '2026-01-01', end_date: '2026-01-11' }, '2026-01-06').left, 5);
  assert.equal(timeline({}, today), null);
  assert.equal(addDays('2026-01-30', 3), '2026-02-02');
  assert.equal(daysBetween('2026-01-01', '2026-03-01'), 59);
});
