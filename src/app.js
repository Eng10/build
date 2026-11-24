import { state, setState, subscribe, navigate, makeContext } from './state/store.js';
import * as auth from './data/auth.js';
import * as repo from './data/repo.js';
import { uploadFile, signedUrl, removeFile } from './data/storage.js';
import { watchProject, watchNotifications } from './data/realtime.js';
import { normalizeError, AppError } from './data/errors.js';
import { isConfigured } from './config.js';
import { view } from './ui/render.js';
import { html } from './ui/dom.js';
import { viewerSheet } from './ui/components.js';
import { t, setLang, dirOf, defaultStageNames } from './i18n/index.js';
import { today } from './domain/dates.js';
import { parseNum, normalizePhone, normalizeUsername, isValidUsername, isValidPhone, identifierOf } from './domain/format.js';
import { PRESETS } from './domain/permissions.js';
import { mimeOf, cleanName, checkFiles } from './domain/files.js';
import { switchSheet, projectForm } from './ui/views/projects.js';
import { stageForm, itemForm } from './ui/views/stage.js';
import { paymentForm, itemOptions } from './ui/views/payments.js';
import { contractorForm } from './ui/views/contractors.js';
import { updateForm, issueForm, attsOf } from './ui/views/site.js';
import { inviteForm, memberForm, rolesSheet } from './ui/views/team.js';
import { profileForm } from './ui/views/settings.js';
import { summaryText } from './ui/views/reports.js';

const $ = (s) => document.querySelector(s);
const PREFS = 'bl.prefs';
const LAST = 'bl.project';
let unwatchProject = null;
let unwatchNotes = null;
let pendingConfirm = null;
let viewerState = null;

// ---------------------------------------------------------------- واجهة عامة
export function toast(msg, ms = 3200) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('on'), ms);
}
const errMsg = (e) => t('err_' + normalizeError(e).code) + ' | ' + (e?.raw?.message || e?.message || JSON.stringify(e));
function openSheet(safe) {
  $('#sheet-body').innerHTML = String(safe);
  $('#sheet').hidden = false;
  document.body.classList.add('noscroll');
  hydrate();
  $('#sheet-body').querySelector('input:not([type=hidden]),select,textarea,button')?.focus({ preventScroll: true });
}
function closeSheet() {
  $('#sheet').hidden = true;
  $('#sheet-body').innerHTML = '';
  document.body.classList.remove('noscroll');
  pendingConfirm = null;
  viewerState = null;
}
function askConfirm(note, fn) {
  pendingConfirm = fn;
  openSheet(html`<h3>${t('confirm_title')}</h3><p>${note || t('confirm_irreversible')}</p>
    <button class="btn d" data-act="confirm-yes">${t('yes_delete')}</button><button class="btn o" data-act="sheet-close">${t('cancel')}</button>`);
}

// الصور والملفات الخاصة تُحمَّل برابط موقّع مؤقت بعد رسم الصفحة
function hydrate() {
  document.querySelectorAll('img[data-signed]').forEach(async (img) => {
    if (img.getAttribute('src')) return;
    const [bucket, ...rest] = img.dataset.signed.split('|');
    try {
      img.src = await signedUrl(bucket, rest.join('|'));
    } catch {
      img.alt = '⚠';
    }
  });
}

function applyLook() {
  setLang(state.lang);
  const root = document.documentElement;
  root.lang = state.lang;
  root.dir = dirOf(state.lang);
  if (state.theme === 'auto') root.removeAttribute('data-theme');
  else root.dataset.theme = state.theme;
  document.title = t('appName');
}

let frame = 0;
function paint() {
  applyLook();
  const y = window.scrollY;
  $('#app').innerHTML = String(view(state));
  window.scrollTo(0, y);
  hydrate();
}
const schedule = () => {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(paint);
};

const loadPrefs = () => {
  try { return JSON.parse(localStorage.getItem(PREFS)) ?? {}; } catch { return {}; }
};
const savePrefs = () => {
  try { localStorage.setItem(PREFS, JSON.stringify({ lang: state.lang, theme: state.theme })); } catch { /* ignore */ }
};

// ---------------------------------------------------------------- البيانات
export async function refreshMeta() {
  const [projects, invites, notes] = await Promise.all([repo.listProjects(), repo.listInvites(), repo.listNotes()]);
  setState({ projects, invites, notes });
  if (state.projectId && !projects.some((p) => p.id === state.projectId)) {
    if (projects[0]) await selectProject(projects[0].id);
    else { unwatchProject?.(); setState({ projectId: null, data: { ...state.data, members: [] } }); }
  }
}

export async function refreshProject() {
  const pid = state.projectId;
  if (!pid || !state.user) return;
  const members = await repo.loadMembers(pid);
  const me = members.find((m) => m.user_id === state.user.id);
  if (!me || me.status !== 'active') return refreshMeta();
  const caps = { costs: !!me.can_costs, visits: !!me.can_visits };
  const rest = await repo.loadProjectData(pid, caps);
  if (state.projectId === pid) setState({ data: { members, ...rest } });
  const flagsChanged = state.projects.find((p) => p.id === pid)?.costs_visible !== caps.costs;
  if (flagsChanged) await refreshMeta();
}

export async function selectProject(id) {
  unwatchProject?.();
  setState({ projectId: id, route: { ...state.route, tab: 'home', sub: null, id: null, stack: [] } });
  try { localStorage.setItem(LAST, id); } catch { /* ignore */ }
  await refreshProject();
  unwatchProject = watchProject(id, () => { refreshProject().catch(() => {}); refreshMeta().catch(() => {}); });
}

async function bootstrap() {
  const profile = await auth.getProfile(state.user.id);
  setState({ profile, lang: profile.lang, theme: profile.theme });
  savePrefs();
  await refreshMeta();
  unwatchNotes?.();
  unwatchNotes = watchNotifications(state.user.id, () => refreshMeta().catch(() => {}));
  let last = null;
  try { last = localStorage.getItem(LAST); } catch { /* ignore */ }
  const first = state.projects.find((p) => p.id === last) ?? state.projects[0];
  if (first) await selectProject(first.id);
  setState({ ready: true });
}

function teardown() {
  unwatchProject?.(); unwatchNotes?.();
  unwatchProject = unwatchNotes = null;
  closeSheet();
  setState({
    session: null, user: null, profile: null, projects: [], invites: [], notes: [], projectId: null,
    data: { members: [], stages: [], items: [], contractors: [], payments: [], updates: [], issues: [], messages: [], attachments: [] },
    route: { tab: 'home', sub: null, id: null, auth: 'in', period: 'all', site: 'updates', stack: [] },
  });
}

// ---------------------------------------------------------------- مساعدات النماذج والمرفقات
const text = (fd, k) => String(fd.get(k) ?? '').trim();
const fileOf = (fd) => { const f = fd.get('file'); return f && f.size ? f : null; };
const filesOf = (fd) => fd.getAll('files').filter((f) => f && f.size);
const need = (ok) => { if (!ok) throw new AppError('fill'); };
const orNull = (v) => (v ? v : null);
const pid = () => state.projectId;
const ctx = () => makeContext();
const push = (patch) => setState({ route: { ...state.route, stack: [...(state.route.stack ?? []), { tab: state.route.tab, sub: state.route.sub, id: state.route.id, site: state.route.site }], ...patch } });
const pop = () => { const st = [...(state.route.stack ?? [])]; const prev = st.pop() ?? { sub: null, id: null }; setState({ route: { ...state.route, ...prev, stack: st } }); window.scrollTo(0, 0); };
const done = async () => { closeSheet(); await refreshProject(); };

async function uploadAttachments(bucket, ownerKind, ownerId, files, existing = 0) {
  if (!files.length) return;
  checkFiles(bucket, files, existing);
  const rows = [];
  for (const f of files) {
    const path = await uploadFile(bucket, pid(), f);
    rows.push({
      owner_kind: ownerKind,
      owner_id: ownerId,
      bucket,
      path,
      name: cleanName(f.name),
      mime: mimeOf(f),
      size: f.size,
    });
  }
  await repo.addAttachments(pid(), rows);
}

async function purgeOwnerAttachments(ownerKind, ownerId) {
  const list = attsOf(ctx(), ownerKind, ownerId);
  if (!list.length) return;
  await repo.removeAttachments(list.map((a) => a.id));
  await Promise.all(list.map((a) => removeFile(a.bucket, a.path).catch(() => {})));
}

async function showViewer(list, index) {
  const i = ((index % list.length) + list.length) % list.length;
  const a = list[i];
  const url = await signedUrl(a.bucket, a.path);
  openSheet(viewerSheet(a, url, i, list.length));
  viewerState = { list, index: i };
}

// ---------------------------------------------------------------- الإجراءات (click)
const A = {
  'sheet-close': closeSheet,
  'confirm-yes': async () => { const fn = pendingConfirm; closeSheet(); if (fn) await fn(); },
  'auth-mode': (el) => setState({ route: { ...state.route, auth: el.dataset.id } }),
  'lang-set': async (el) => {
    setState({ lang: el.dataset.id }); savePrefs();
    if (state.user) await auth.updateProfile(state.user.id, { lang: state.lang });
  },
  'theme-set': async (el) => {
    setState({ theme: el.dataset.id }); savePrefs();
    if (state.user) await auth.updateProfile(state.user.id, { theme: state.theme });
  },
  signout: async () => { await auth.signOut(); },
  nav: (el) => { navigate({ tab: el.dataset.id, stack: [] }); window.scrollTo(0, 0); },
  open: (el) => { push({ sub: el.dataset.sub, id: el.dataset.id || null }); window.scrollTo(0, 0); },
  back: pop,
  'notes-open': () => { push({ sub: 'notes', id: null }); },
  'project-switch': () => openSheet(switchSheet(ctx())),
  'project-select': async (el) => { closeSheet(); await selectProject(el.dataset.id); },
  'project-new': () => openSheet(projectForm(null)),
  'project-edit': () => openSheet(projectForm(ctx().project)),
  'invite-accept': async (el) => { await repo.respondInvite(el.dataset.id, true); await refreshMeta(); await selectProject(el.dataset.id); },
  'invite-decline': async (el) => { await repo.respondInvite(el.dataset.id, false); await refreshMeta(); },
  'stage-new': () => openSheet(stageForm(null)),
  'stage-edit': (el) => openSheet(stageForm(ctx().d.stages.find((s) => s.id === el.dataset.id))),
  'item-new': (el) => openSheet(itemForm(null, el.dataset.id)),
  'item-edit': (el) => openSheet(itemForm(ctx().d.items.find((i) => i.id === el.dataset.id))),
  'pay-new': (el) => { const c = ctx(); if (!c.d.stages.length) throw new AppError('fill'); openSheet(paymentForm(c, null, el.dataset.id || state.route.id || null)); },
  'pay-edit': (el) => { const c = ctx(); openSheet(paymentForm(c, c.d.payments.find((p) => p.id === el.dataset.id), null)); },
  'pay-markpaid': async (el) => { await repo.markPaid(el.dataset.id, today()); await refreshProject(); },
  'ctr-new': () => openSheet(contractorForm(null)),
  'ctr-edit': (el) => openSheet(contractorForm(ctx().d.contractors.find((k) => k.id === el.dataset.id))),
  'ctr-file-remove': async (el) => {
    const k = ctx().d.contractors.find((x) => x.id === el.dataset.id);
    await repo.saveContractor(pid(), k.id, { contract_path: null });
    await removeFile('contracts', k.contract_path); await refreshProject();
  },
  'file-view': async (el) => {
    const url = await signedUrl(el.dataset.bucket, el.dataset.path);
    const pdf = el.dataset.path.endsWith('.pdf');
    openSheet(html`<h3>${t(el.dataset.bucket === 'contracts' ? 'contract_file' : 'receipt')}</h3>
      ${pdf ? html`<iframe class="pdf" src="${url}" title="PDF"></iframe>` : html`<img class="photo" src="${url}" alt="">`}
      <a class="btn o" href="${url}" target="_blank" rel="noopener noreferrer">↗</a><button class="btn" data-act="sheet-close">${t('close')}</button>`);
  },
  'att-open': async (el) => {
    const c = ctx();
    const target = (c.d.attachments ?? []).find((a) => a.id === el.dataset.id);
    if (!target) return;
    const list = attsOf(c, target.owner_kind, target.owner_id);
    const idx = Math.max(0, list.findIndex((a) => a.id === target.id));
    await showViewer(list, idx);
  },
  'att-nav': async (el) => {
    if (!viewerState) return;
    await showViewer(viewerState.list, viewerState.index + Number(el.dataset.dir || 0));
  },
  'rep-period': (el) => setState({ route: { ...state.route, period: el.dataset.id } }),
  'rep-copy': async () => { await navigator.clipboard.writeText(summaryText(ctx())); toast(t('copied')); },
  'site-tab': (el) => setState({ route: { ...state.route, site: el.dataset.id } }),
  'upd-new': () => openSheet(updateForm(ctx(), null)),
  'upd-edit': (el) => { const c = ctx(); openSheet(updateForm(c, c.d.updates.find((u) => u.id === el.dataset.id))); },
  'issue-new': () => openSheet(issueForm(ctx())),
  'member-new': () => openSheet(inviteForm(ctx())),
  'member-edit': (el) => { const c = ctx(); openSheet(memberForm(c, c.d.members.find((m) => m.user_id === el.dataset.id))); },
  'roles-help': () => openSheet(rolesSheet()),
  'profile-edit': () => openSheet(profileForm(state.profile)),
  'note-read': async (el) => {
    await repo.markNoteRead(el.dataset.id);
    setState({ notes: state.notes.map((n) => (n.id === el.dataset.id ? { ...n, read: true } : n)) });
  },
  'notes-readall': async () => { await repo.markAllNotesRead(); setState({ notes: state.notes.map((n) => ({ ...n, read: true })) }); },
  'ask-delete': (el) => {
    const { kind, id } = el.dataset;
    const note = { stage: t('stage_delete_note'), project: t('project_delete_note') }[kind];
    askConfirm(note, () => guarded(() => DELETE[kind](id)));
  },
};

const DELETE = {
  stage: async (id) => { await repo.removeRow('stages', id); pop(); await refreshProject(); },
  item: async (id) => { await repo.removeRow('items', id); await refreshProject(); },
  payment: async (id) => {
    const p = ctx().d.payments.find((x) => x.id === id);
    await repo.removeRow('payments', id); await removeFile('receipts', p?.receipt_path).catch(() => {});
    pop(); await refreshProject();
  },
  contractor: async (id) => {
    const k = ctx().d.contractors.find((x) => x.id === id);
    await repo.removeRow('contractors', id); await removeFile('contracts', k?.contract_path).catch(() => {});
    pop(); await refreshProject();
  },
  update: async (id) => {
    const u = ctx().d.updates.find((x) => x.id === id);
    await purgeOwnerAttachments('update', id);
    await repo.removeRow('project_updates', id);
    if (u?.photo_path) await removeFile('updates', u.photo_path).catch(() => {});
    await refreshProject();
  },
  issue: async (id) => {
    const c = ctx();
    const msgs = c.d.messages.filter((m) => m.issue_id === id);
    for (const m of msgs) await purgeOwnerAttachments('message', m.id);
    await purgeOwnerAttachments('issue', id);
    await repo.removeRow('issues', id);
    pop(); await refreshProject();
  },
  member: async (id) => { await repo.removeMember(pid(), id); await refreshProject(); },
  leave: async (id) => { await repo.leaveProject(id); await refreshMeta(); },
  project: async (id) => { await repo.deleteProject(id); await refreshMeta(); },
};

// ---------------------------------------------------------------- النماذج (submit)
const F = {
  signin: async (f, fd) => { await auth.signIn({ email: text(fd, 'email'), password: String(fd.get('password') ?? '') }); },
  signup: async (f, fd) => {
    const username = normalizeUsername(fd.get('username'));
    const phone = normalizePhone(fd.get('phone') ?? '');
    need(text(fd, 'name') && isValidUsername(username) && String(fd.get('password') ?? '').length >= 8 && (!phone || isValidPhone(phone)));
    if (!(await auth.isHandleFree(username, phone))) throw new AppError('taken');
    const r = await auth.signUp({ email: text(fd, 'email'), password: String(fd.get('password')), name: text(fd, 'name'), username, phone });
    if (!r.session) { toast(t('auth_confirm_email'), 7000); setState({ route: { ...state.route, auth: 'in' } }); }
  },
  forgot: async (f, fd) => { await auth.requestPasswordReset(text(fd, 'email')); toast(t('auth_reset_sent'), 5000); },
  recovery: async (f, fd) => {
    const pw = String(fd.get('password') ?? ''); need(pw.length >= 8);
    await auth.setNewPassword(pw); setState({ recovery: false });
  },
  profile: async (f, fd) => {
    const phone = normalizePhone(fd.get('phone') ?? ''); need(text(fd, 'name') && (!phone || isValidPhone(phone)));
    const patch = { name: text(fd, 'name'), phone: phone || null };
    await auth.updateProfile(state.user.id, patch);
    setState({ profile: { ...state.profile, ...patch } }); closeSheet();
  },
  project: async (f, fd) => {
    const id = f.dataset.id; const budget = parseNum(fd.get('budget')) ?? 0; need(text(fd, 'name') && budget >= 0);
    const start = orNull(fd.get('start')); const end = orNull(fd.get('end')); need(!start || !end || start <= end);
    if (id) { await repo.saveProject(id, { name: text(fd, 'name'), budget, start_date: start, end_date: end }); closeSheet(); await refreshMeta(); await refreshProject(); return; }
    const newId = await repo.createProject({ name: text(fd, 'name'), budget, start, end, stages: defaultStageNames() });
    closeSheet(); await refreshMeta(); await selectProject(newId);
  },
  stage: async (f, fd) => {
    const id = f.dataset.id; const budget = parseNum(fd.get('budget')) ?? 0; need(text(fd, 'name') && budget >= 0);
    const fields = { name: text(fd, 'name'), start_date: orNull(fd.get('start')), end_date: orNull(fd.get('end')), status: text(fd, 'status'), budget };
    if (!id) fields.position = ctx().d.stages.length + 1;
    await repo.saveStage(pid(), id || null, fields); await done();
  },
  item: async (f, fd) => {
    const id = f.dataset.id; const budget = parseNum(fd.get('budget')) ?? 0; need(text(fd, 'name') && budget >= 0);
    await repo.saveItem(pid(), id || null, id ? { name: text(fd, 'name'), budget } : { name: text(fd, 'name'), budget, stage_id: f.dataset.stage });
    await done();
  },
  payment: async (f, fd) => {
    const id = f.dataset.id; const c = ctx(); const old = id ? c.d.payments.find((p) => p.id === id) : null;
    const amount = parseNum(fd.get('amount')); need(amount > 0 && text(fd, 'stage_id'));
    let itemId = orNull(fd.get('item_id'));
    if (text(fd, 'new_item')) itemId = (await repo.createItem(pid(), text(fd, 'stage_id'), text(fd, 'new_item'))).id;
    let receipt = old?.receipt_path ?? null; const file = fileOf(fd);
    if (file) { const path = await uploadFile('receipts', pid(), file); if (receipt) await removeFile('receipts', receipt).catch(() => {}); receipt = path; }
    await repo.savePayment(pid(), id || null, {
      stage_id: text(fd, 'stage_id'), item_id: itemId, contractor_id: orNull(fd.get('contractor_id')), amount, kind: text(fd, 'kind'), method: text(fd, 'method'),
      payee: text(fd, 'payee') || null, invoice_no: text(fd, 'invoice_no') || null, vat_rate: Number(fd.get('vat_rate') || 0), status: text(fd, 'status'),
      paid_on: text(fd, 'date') || today(), note: text(fd, 'note') || null, receipt_path: receipt,
    });
    await done();
  },
  contractor: async (f, fd) => {
    const id = f.dataset.id; const old = id ? ctx().d.contractors.find((k) => k.id === id) : null; const value = parseNum(fd.get('value')) ?? 0; need(text(fd, 'name') && value >= 0);
    let path = old?.contract_path ?? null; const file = fileOf(fd);
    if (file) { const np = await uploadFile('contracts', pid(), file); if (path) await removeFile('contracts', path).catch(() => {}); path = np; }
    await repo.saveContractor(pid(), id || null, {
      name: text(fd, 'name'), trade: text(fd, 'trade') || null, phone: text(fd, 'phone') || null,
      scope: String(fd.get('scope') ?? '').split('\n').map((x) => x.trim()).filter(Boolean),
      contract_value: value, start_date: orNull(fd.get('start')), end_date: orNull(fd.get('end')), contract_path: path,
    });
    await done();
  },
  update: async (f, fd) => {
    const id = f.dataset.id;
    need(text(fd, 'title'));
    const files = filesOf(fd);
    const removeIds = fd.getAll('remove').map(String);
    const current = id ? attsOf(ctx(), 'update', id) : [];
    const remaining = current.filter((a) => !removeIds.includes(String(a.id)));
    if (files.length) checkFiles('updates', files, remaining.length);

    const fields = { title: text(fd, 'title'), body: String(fd.get('body') ?? ''), posted_on: text(fd, 'date') || today() };
    let targetId = id;
    if (id) {
      await repo.saveUpdate(pid(), id, fields);
      if (removeIds.length) {
        const toDel = current.filter((a) => removeIds.includes(String(a.id)));
        await repo.removeAttachments(removeIds);
        await Promise.all(toDel.map((a) => removeFile(a.bucket, a.path).catch(() => {})));
      }
    } else {
      const created = await repo.insertReturning('project_updates', pid(), fields);
      targetId = created.id;
    }
    await uploadAttachments('updates', 'update', targetId, files, remaining.length);
    await done();
  },
  issue: async (f, fd) => {
    need(text(fd, 'title'));
    const files = filesOf(fd);
    if (files.length) checkFiles('visits', files, 0);
    const created = await repo.insertReturning('issues', pid(), {
      title: text(fd, 'title'),
      description: String(fd.get('description') ?? ''),
      stage_id: orNull(fd.get('stage_id')),
    });
    await uploadAttachments('visits', 'issue', created.id, files, 0);
    await done();
  },
  message: async (f, fd) => {
    const body = text(fd, 'body');
    const files = filesOf(fd);
    need(body || files.length);
    if (files.length) checkFiles('visits', files, 0);
    const created = await repo.sendMessage(pid(), f.dataset.id, body);
    await uploadAttachments('visits', 'message', created.id, files, 0);
    await refreshProject();
  },
  invite: async (f, fd) => {
    const identifier = identifierOf(fd.get('identifier')); need(identifier);
    await repo.inviteMember(pid(), identifier, text(fd, 'role')); toast(t('invite_sent')); await done();
  },
  member: async (f, fd) => {
    await repo.updateMember(pid(), f.dataset.id, {
      role: text(fd, 'role'), title: text(fd, 'title'), costs: fd.has('costs'), edit: fd.has('edit'), visits: fd.has('visits'),
      manage: fd.has('manage'), contractor: orNull(fd.get('contractor_id')),
    });
    await done();
  },
};

// ---------------------------------------------------------------- تغييرات الحقول
const C = {
  'pay-stage': (el) => { el.form.elements.item_id.innerHTML = String(itemOptions(ctx(), el.value, '')); },
  'issue-status': async (el) => { await repo.setIssueStatus(el.dataset.id, el.value); await refreshProject(); },
  'np-toggle': async (el) => {
    const notify = { ...state.profile.notify, [el.dataset.id]: el.checked };
    await auth.updateProfile(state.user.id, { notify }); setState({ profile: { ...state.profile, notify } });
  },
  'role-preset': (el) => {
    const p = PRESETS[el.value]; const e = el.form.elements; if (!p) return;
    e.costs.checked = p.costs; e.edit.checked = p.edit; e.visits.checked = p.visits;
    if (!e.manage.disabled) e.manage.checked = p.manage;
  },
};

async function guarded(fn, btn) {
  if (btn?.disabled) return;
  if (btn) btn.disabled = true;
  try { await fn(); } catch (e) { toast(errMsg(e)); } finally { if (btn) btn.disabled = false; }
}

function wireEvents() {
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (el && A[el.dataset.act]) guarded(() => A[el.dataset.act](el, ev));
  });
  document.addEventListener('submit', (ev) => {
    const f = ev.target.closest('form[data-form]');
    if (!f || !F[f.dataset.form]) return;
    ev.preventDefault();
    guarded(() => F[f.dataset.form](f, new FormData(f)), f.querySelector('[type=submit]'));
  });
  document.addEventListener('change', (ev) => {
    const el = ev.target.closest('[data-change]');
    if (el && C[el.dataset.change]) guarded(() => C[el.dataset.change](el, ev));
  });
  $('#sheet').addEventListener('click', (ev) => { if (ev.target.id === 'sheet') closeSheet(); });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !$('#sheet').hidden) closeSheet(); });
  const refresh = () => { if (state.user && state.projectId) { refreshProject().catch(() => {}); refreshMeta().catch(() => {}); } };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.addEventListener('online', refresh);
}

// ---------------------------------------------------------------- التشغيل
export function init() {
  const prefs = loadPrefs();
  setState({ lang: prefs.lang === 'en' ? 'en' : 'ar', theme: ['light', 'dark'].includes(prefs.theme) ? prefs.theme : 'auto' });
  subscribe(schedule);
  wireEvents();
  if (!isConfigured) { setState({ configured: false, ready: true }); return; }
  setState({ ready: false });
  auth.onAuthChange((event, session) => {
    // لا نستدعي Supabase مباشرة داخل المستمع لتفادي التعليق؛ نؤجّل للدورة التالية
    setTimeout(async () => {
      try {
        if (event === 'PASSWORD_RECOVERY') { setState({ recovery: true, session, user: session?.user ?? null, ready: true }); return; }
        if (!session) { teardown(); setState({ ready: true }); return; }
        if (event === 'TOKEN_REFRESHED' || (state.user?.id === session.user.id && state.ready)) { setState({ session }); return; }
        setState({ session, user: session.user });
        await bootstrap();
      } catch (e) {
        toast(errMsg(e)); setState({ ready: true });
      }
    }, 0);
  });
}