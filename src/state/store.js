import { capsOf } from '../domain/permissions.js';

const listeners = new Set();

export const state = {
  ready: false,
  configured: true,
  session: null,
  user: null,
  profile: null,
  recovery: false,
  lang: 'ar',
  theme: 'auto',
  projects: [],
  invites: [],
  notes: [],
  projectId: null,
  data: { members: [], stages: [], items: [], contractors: [], payments: [], updates: [], issues: [], messages: [], attachments: [] },
  route: { tab: 'home', sub: null, id: null, auth: 'in', period: 'all', site: 'updates' },
};

export const getState = () => state;
export const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));

export function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => fn(state));
}

export function navigate(route) {
  setState({ route: { ...state.route, sub: null, id: null, ...route } });
}

// سياق جاهز للعرض: المشروع الحالي + صلاحيات المستخدم فيه
export function makeContext(s = state) {
  const uid = s.user?.id ?? null;
  const me = s.data.members.find((m) => m.user_id === uid) ?? null;
  const caps = capsOf(me);
  const project = s.projects.find((p) => p.id === s.projectId) ?? null;
  return { s, d: s.data, uid, me, caps, project, hidden: !caps.costs, isOwner: !!project && project.created_by === uid };
}