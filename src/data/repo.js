import { db } from './client.js';
import { unwrap } from './errors.js';

// ---- القراءة -------------------------------------------------------------
export const listProjects = async () => unwrap(await db().from('v_projects').select('*').order('created_at'));
export const listInvites = async () => unwrap(await db().from('v_my_invites').select('*').order('created_at', { ascending: false }));
export const listNotes = async () =>
  unwrap(await db().from('notifications').select('*').order('created_at', { ascending: false }).limit(100));

export async function loadMembers(pid) {
  return unwrap(await db().from('project_members').select('*, profile:profiles!user_id(name,username,phone)').eq('project_id', pid));
}

// كل جدول يُقرأ حسب صلاحية المستخدم؛ القاعدة نفسها ترفض/تخفي ما لا يحق له.
export async function loadProjectData(pid, caps) {
  const empty = Promise.resolve({ data: [], error: null });
  const q = (table, order, asc = true) => db().from(table).select('*').eq('project_id', pid).order(order, { ascending: asc });
  const [stages, items, contractors, updates, payments, issues, messages, attachments] = await Promise.all([
    q('v_stages', 'position'),
    q('v_items', 'id'),
    q('v_contractors', 'name'),
    q('project_updates', 'posted_on', false),
    caps.costs ? q('payments', 'paid_on', false) : empty,
    caps.visits ? q('issues', 'created_at', false) : empty,
    caps.visits ? q('issue_messages', 'created_at') : empty,
    q('attachments', 'created_at'),
  ]);
  return {
    stages: unwrap(stages),
    items: unwrap(items),
    contractors: unwrap(contractors),
    updates: unwrap(updates),
    payments: unwrap(payments),
    issues: unwrap(issues),
    messages: unwrap(messages),
    attachments: unwrap(attachments),
  };
}

// ---- الكتابة العامة ------------------------------------------------------
const write = async (table, id, fields, pid) =>
  unwrap(id ? await db().from(table).update(fields).eq('id', id) : await db().from(table).insert({ ...fields, project_id: pid }));

export const saveStage = (pid, id, f) => write('stages', id, f, pid);
export const saveItem = (pid, id, f) => write('items', id, f, pid);
export const saveContractor = (pid, id, f) => write('contractors', id, f, pid);
export const savePayment = (pid, id, f) => write('payments', id, f, pid);
export const saveUpdate = (pid, id, f) => write('project_updates', id, f, pid);
export const saveIssue = (pid, id, f) => write('issues', id, f, pid);
export const removeRow = async (table, id) => unwrap(await db().from(table).delete().eq('id', id));

export const createItem = async (pid, stageId, name) =>
  unwrap(await db().from('items').insert({ project_id: pid, stage_id: stageId, name }).select('id').single());

export const markPaid = async (id, date) => unwrap(await db().from('payments').update({ status: 'paid', paid_on: date }).eq('id', id));
export const setIssueStatus = async (id, status) => unwrap(await db().from('issues').update({ status }).eq('id', id));

// إدراج صف جديد وإرجاع رقمه (لنربط به المرفقات)
export const insertReturning = async (table, pid, fields) =>
  unwrap(await db().from(table).insert({ ...fields, project_id: pid }).select('id').single());

export const sendMessage = async (pid, issueId, body) =>
  unwrap(await db().from('issue_messages').insert({ project_id: pid, issue_id: issueId, body }).select('id').single());

// ---- المرفقات --------------------------------------------------------------
export const addAttachments = async (pid, rows) =>
  unwrap(await db().from('attachments').insert(rows.map((r) => ({ ...r, project_id: pid }))));
export const removeAttachments = async (ids) => unwrap(await db().from('attachments').delete().in('id', ids));

export const saveProject = async (id, patch) => unwrap(await db().from('projects').update(patch).eq('id', id));
export const deleteProject = async (id) => unwrap(await db().from('projects').delete().eq('id', id));
export const createProject = async ({ name, budget, start, end, stages }) =>
  unwrap(await db().rpc('create_project', { p_name: name, p_budget: budget || 0, p_start: start || null, p_end: end || null, p_stages: stages }));

// ---- الأعضاء (عبر دوال الخادم التي تفرض القواعد) -------------------------
export const inviteMember = async (pid, identifier, role) =>
  unwrap(await db().rpc('invite_member', { p_project: pid, p_identifier: identifier, p_role: role }));
export const respondInvite = async (pid, accept) => unwrap(await db().rpc('respond_invite', { p_project: pid, p_accept: accept }));
export const updateMember = async (pid, uid, f) =>
  unwrap(
    await db().rpc('update_member', {
      p_project: pid, p_user: uid, p_role: f.role, p_title: f.title ?? '',
      p_costs: f.costs, p_edit: f.edit, p_visits: f.visits, p_manage: f.manage, p_contractor: f.contractor ?? null,
    }),
  );
export const removeMember = async (pid, uid) => unwrap(await db().rpc('remove_member', { p_project: pid, p_user: uid }));
export const leaveProject = async (pid) => unwrap(await db().rpc('leave_project', { p_project: pid }));

// ---- الإشعارات -----------------------------------------------------------
export const markNoteRead = async (id) => unwrap(await db().from('notifications').update({ read: true }).eq('id', id));
export const markAllNotesRead = async () => unwrap(await db().from('notifications').update({ read: true }).eq('read', false));