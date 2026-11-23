import { html } from '../dom.js';
import { t } from '../../i18n/index.js';
import { header, fld, opts, check, chip } from '../components.js';
import { PRESETS, ROLES, assignableRoles, canManageTarget } from '../../domain/permissions.js';

const flagsText = (m) => `${m.can_costs ? '💰' : '🔒'}${m.can_edit ? ' ✎' : ''}${m.can_visits ? ' 📷' : ''}${m.can_manage ? ' 👥' : ''}`;

export function teamView(c) {
  const row = (m) => {
    const can = canManageTarget({ caps: c.caps, isOwner: c.isOwner, target: m, ownerId: c.project.created_by });
    const inner = html`<span><b>${m.profile?.name ?? '—'}${m.user_id === c.uid ? ` (${t('you')})` : ''}</b>
      <span class="mut block"><bdi>@${m.profile?.username ?? ''}</bdi> · ${t('role_' + m.role)}${m.title ? ` · ${m.title}` : ''}</span></span>
      ${chip(m.status === 'pending' ? t('member_pending') : flagsText(m))}`;
    return can ? html`<button class="r" data-act="member-edit" data-id="${m.user_id}">${inner}</button>` : html`<div class="r">${inner}</div>`;
  };
  const active = c.d.members.filter((m) => m.status === 'active');
  const pending = c.d.members.filter((m) => m.status === 'pending');
  return html`${header(t('team'), { back: true, right: c.caps.manage ? html`<button class="ib" data-act="member-new" aria-label="${t('member_invite')}">＋</button>` : '' })}
    <div class="note">${c.caps.manage ? '' : html`${t('only_managers')}<br>`}${t('legend')}</div>
    <div class="grp">${active.map(row)}</div>
    ${pending.length ? html`<h2>${t('member_pending')}</h2><div class="grp">${pending.map(row)}</div>` : ''}`;
}

export const inviteForm = (c) => html`<h3>${t('member_invite')}</h3>
  <form data-form="invite" data-id="">
    ${fld(t('identifier'), html`<input name="identifier" required dir="ltr" autocomplete="off" placeholder="${t('identifier_hint')}">`)}
    ${fld(t('role_label'), html`<select name="role">${opts(assignableRoles(c.isOwner).map((r) => [r, t('role_' + r)]), 'user')}</select>`)}
    <button class="btn" type="submit">${t('member_invite')}</button></form>`;

export function memberForm(c, m) {
  const roles = assignableRoles(c.isOwner);
  const list = roles.includes(m.role) ? roles : [m.role, ...roles];
  return html`<h3>${m.profile?.name ?? ''}</h3><div class="mut">@${m.profile?.username ?? ''}</div>
    <form data-form="member" data-id="${m.user_id}">
      ${fld(t('role_label'), html`<select name="role" data-change="role-preset">${opts(list.map((r) => [r, t('role_' + r)]), m.role)}</select>`)}
      ${fld(t('role_title'), html`<input name="title" maxlength="60" value="${m.title ?? ''}">`)}
      ${check('costs', t('perm_costs'), m.can_costs)}${check('edit', t('perm_edit'), m.can_edit)}${check('visits', t('perm_visits'), m.can_visits)}${check('manage', t('perm_manage'), m.can_manage, !c.isOwner)}
      ${fld(t('linked_contractor'), html`<select name="contractor_id">${opts([['', t('none')], ...c.d.contractors.map((k) => [k.id, k.name])], m.contractor_id)}</select>`)}
      <button class="btn" type="submit">${t('save')}</button>
      <button type="button" class="btn d" data-act="ask-delete" data-kind="member" data-id="${m.user_id}">${t('member_remove')}</button></form>`;
}

export const rolesSheet = () => html`<h3>${t('roles_help')}</h3><div class="mut">${t('legend')}</div>
  <div class="grp">${ROLES.map((r) => html`<div class="r"><b>${t('role_' + r)}</b><span>${flagsText({ can_costs: PRESETS[r].costs, can_edit: PRESETS[r].edit, can_visits: PRESETS[r].visits, can_manage: PRESETS[r].manage })}</span></div>`)}</div>
  <button class="btn" data-act="sheet-close">${t('close')}</button>`;
