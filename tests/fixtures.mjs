// بيانات اختبار بنفس شكل ما تُرجعه قاعدة البيانات
export const AMOUNTS = ['123,456', '654,321', '77,777', '500,000', '100,000', '300,000', '1,800,000', '45,000'];

const mem = (user_id, role, f, name, username, contractor_id = null, status = 'active') => ({
  project_id: 'p1', user_id, role, title: null, can_costs: !!f.costs, can_edit: !!f.edit, can_visits: !!f.visits, can_manage: !!f.manage,
  contractor_id, status, profile: { name, username, phone: null },
});

export const USERS = {
  admin: 'u1', supervisor: 'u2', user: 'u3', contractor: 'u4',
};

export function makeState({ as = 'admin', lang = 'ar', leaky = false, route = {}, nameOverride } = {}) {
  const hide = as === 'contractor';
  const members = [
    mem('u1', 'admin', { costs: 1, edit: 1, visits: 1, manage: 1 }, 'Owner', 'owner'),
    mem('u2', 'supervisor', { costs: 1, edit: 1, visits: 1 }, 'Sup', 'sup'),
    mem('u3', 'user', { costs: 1 }, 'Viewer', 'viewer'),
    mem('u4', 'user', {}, 'Abu Saad', 'abusaad', 'k1'),
    mem('u5', 'user', { costs: 1 }, 'Newbie', 'newbie', null, 'pending'),
  ];
  const money = (n) => (hide ? null : n);
  const payments = [
    { id: 'pay1', project_id: 'p1', stage_id: 's2', item_id: 'i1', contractor_id: 'k1', amount: 123456, kind: 'materials', method: 'transfer', payee: 'Supplier', invoice_no: 'A-1', vat_rate: 15, status: 'paid', paid_on: '2026-10-20', note: 'n', receipt_path: 'p1/r.jpg', created_by: 'u1' },
    { id: 'pay2', project_id: 'p1', stage_id: 's1', item_id: null, contractor_id: null, amount: 654321, kind: 'fees', method: 'cash', payee: null, invoice_no: null, vat_rate: 0, status: 'paid', paid_on: '2026-08-02', note: null, receipt_path: null, created_by: 'u1' },
    { id: 'pay3', project_id: 'p1', stage_id: 's2', item_id: null, contractor_id: 'k1', amount: 77777, kind: 'labor', method: 'check', payee: null, invoice_no: null, vat_rate: 0, status: 'scheduled', paid_on: '2099-01-01', note: null, receipt_path: null, created_by: 'u1' },
  ];
  const data = {
    members,
    stages: [
      { id: 's1', project_id: 'p1', name: 'Land', start_date: '2026-06-01', end_date: '2026-07-01', status: 'done', done_on: '2026-07-01', position: 1, budget: money(100000), progress: 100 },
      { id: 's2', project_id: 'p1', name: 'Structure', start_date: '2026-09-01', end_date: '2027-01-01', status: 'doing', done_on: null, position: 2, budget: money(500000), progress: hide ? 40 : 40 },
      { id: 's3', project_id: 'p1', name: 'Finishes', start_date: null, end_date: null, status: 'todo', done_on: null, position: 3, budget: money(0), progress: null },
    ],
    items: [{ id: 'i1', project_id: 'p1', stage_id: 's2', name: 'Rebar', budget: money(45000) }],
    contractors: [
      { id: 'k1', project_id: 'p1', name: 'Structure Co', trade: 'Concrete', phone: '0500000000', scope: ['Slab', 'Columns'], start_date: null, end_date: null, contract_value: money(300000), contract_path: 'p1/c.pdf' },
      ...(hide ? [] : [{ id: 'k2', project_id: 'p1', name: 'MEP Co', trade: null, phone: null, scope: [], start_date: null, end_date: null, contract_value: 80000, contract_path: null }]),
    ],
    payments: hide && !leaky ? [] : payments,
    updates: [{ id: 'up1', project_id: 'p1', title: 'Slab poured', body: 'done', posted_on: '2026-11-01', photo_path: 'p1/u.jpg', created_by: 'u2' }],
    issues: as === 'user' || hide ? [] : [{ id: 'is1', project_id: 'p1', stage_id: 's2', title: 'Crack', description: 'look', status: 'open', photo_path: null, created_by: 'u1', created_at: '2026-11-02T10:00:00Z' }],
    messages: as === 'user' || hide ? [] : [{ id: 'm1', issue_id: 'is1', project_id: 'p1', body: 'checked', photo_path: null, created_by: 'u2', created_at: '2026-11-02T11:00:00Z' }],
  };
  const att = (id, kind, owner, bucket, path, name, mime, size) => ({ id, project_id: 'p1', owner_kind: kind, owner_id: owner, bucket, path, name, mime, size, created_by: 'u1', created_at: '2026-11-02T10:00:00Z' });
  const hasVisits = !(as === 'user' || hide);
  data.attachments = [
    att('a1', 'update', 'up1', 'updates', 'p1/a.jpg', 'slab.jpg', 'image/jpeg', 2000000),
    att('a2', 'update', 'up1', 'updates', 'p1/b.mp4', 'pour.mp4', 'video/mp4', 30000000),
    att('a3', 'update', 'up1', 'updates', 'p1/c.pdf', 'plan.pdf', 'application/pdf', 800000),
    ...(hasVisits ? [att('a4', 'issue', 'is1', 'visits', 'p1/d.jpg', 'crack.jpg', 'image/jpeg', 900000), att('a5', 'message', 'm1', 'visits', 'p1/e.mp4', 'fix.mp4', 'video/mp4', 12000000)] : []),
  ];
  const uid = USERS[as];
  return {
    ready: true, configured: true, session: { access_token: 'x' }, user: { id: uid }, profile: { name: 'Me', username: 'me', phone: null, notify: { upd: true } }, recovery: false, lang, theme: 'auto',
    projects: [{ id: 'p1', name: nameOverride ?? 'My House', budget: hide ? null : 1800000, created_by: 'u1', costs_visible: !hide, progress: 55, start_date: '2026-06-01', end_date: '2099-12-31' }],
    invites: [], notes: [{ id: 'n1', kind: 'pay_new', data: { amount: 5000, stage: 'Land' }, read: false, created_at: '2026-11-02T10:00:00Z' }],
    projectId: 'p1', data,
    route: { tab: 'home', sub: null, id: null, auth: 'in', period: 'all', site: 'updates', stack: [], ...route },
  };
}