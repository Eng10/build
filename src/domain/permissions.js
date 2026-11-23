export const ROLES = ['admin', 'supervisor', 'user'];

// القيم الافتراضية لكل دور؛ يقدر المسؤول تعديل كل علم على حدة لأي عضو.
export const PRESETS = {
  admin: { costs: true, edit: true, visits: true, manage: true },
  supervisor: { costs: true, edit: true, visits: true, manage: false },
  user: { costs: true, edit: false, visits: false, manage: false },
};

const NONE = { member: false, costs: false, edit: false, visits: false, manage: false };

export function capsOf(member) {
  if (!member || member.status !== 'active') return NONE;
  return { member: true, costs: !!member.can_costs, edit: !!member.can_edit, visits: !!member.can_visits, manage: !!member.can_manage };
}

// نسخة من قواعد الخادم لإخفاء الأزرار فقط (الخادم هو من يفرض القواعد فعلياً)
export function canManageTarget({ caps, isOwner, target, ownerId }) {
  if (!caps.manage || !target) return false;
  if (target.user_id === ownerId) return false;
  if (!isOwner && (target.role === 'admin' || target.can_manage)) return false;
  return true;
}

export const assignableRoles = (isOwner) => (isOwner ? ROLES : ROLES.filter((r) => r !== 'admin'));

export function roleLabelKey(member) {
  return 'role_' + member.role;
}
