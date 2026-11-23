import { html } from '../dom.js';
import { t } from '../../i18n/index.js';
import { header, seg, fld } from '../components.js';

const flags = (m) => `${m.can_costs ? '💰' : '🔒'}${m.can_edit ? ' ✎' : ''}${m.can_visits ? ' 📷' : ''}${m.can_manage ? ' 👥' : ''}`;

export function settingsView(c) {
  const { s, me, caps, isOwner } = c;
  const np = s.profile?.notify ?? {};
  return html`${header(t('settings'))}
    <div class="card"><b class="big2">${s.profile?.name ?? ''}</b><div class="mut"><bdi>@${s.profile?.username ?? ''}</bdi></div>
      <div>${t('your_role')}: <b>${me ? t('role_' + me.role) : ''}</b> ${me ? flags(me) : ''}</div>
      <button class="chip btnchip" data-act="profile-edit">${t('profile_edit')}</button></div>
    <h2>${t('notify_prefs')}</h2><div class="grp">${[['upd', 'np_upd'], ['pay', 'np_pay'], ['vis', 'np_vis'], ['due', 'np_due']].map(
      ([k, label]) => html`<label class="r chk"><input type="checkbox" data-change="np-toggle" data-id="${k}" ${np[k] === false ? '' : 'checked'}><span class="grow">${t(label)}</span></label>`)}</div>
    <h2>${t('appearance')}</h2>${seg([['auto', t('theme_auto')], ['light', t('theme_light')], ['dark', t('theme_dark')]], s.theme, 'theme-set')}
    <h2>${t('language')}</h2>${seg([['ar', 'العربية'], ['en', 'English']], s.lang, 'lang-set')}
    <h2>${c.project.name}</h2><div class="grp">
      ${caps.manage ? html`<button class="r" data-act="project-edit"><span>${t('project_edit')}</span><span class="mut">›</span></button>` : ''}
      <button class="r" data-act="open" data-sub="team"><span>${t('team')}</span><span class="mut">${s.data.members.length} ›</span></button>
      <button class="r" data-act="roles-help"><span>${t('roles_help')}</span><span class="mut">ℹ️</span></button>
      <button class="r" data-act="project-switch"><span>${t('project_switch')}</span><span class="mut">${s.projects.length} ›</span></button></div>
    <button class="btn o" data-act="signout">${t('auth_signout')}</button>
    <h2>${t('danger_zone')}</h2>
    ${isOwner ? html`<button class="btn d" data-act="ask-delete" data-kind="project" data-id="${c.project.id}">${t('project_delete')}</button>`
              : html`<button class="btn d" data-act="ask-delete" data-kind="leave" data-id="${c.project.id}">${t('leave_project')}</button>`}`;
}

export const profileForm = (p) => html`<h3>${t('profile_edit')}</h3>
  <form data-form="profile" data-id="">
    ${fld(t('auth_name'), html`<input name="name" required maxlength="80" value="${p?.name ?? ''}">`)}
    ${fld(t('auth_phone_opt'), html`<input name="phone" type="tel" dir="ltr" inputmode="tel" value="${p?.phone ?? ''}">`)}
    <button class="btn" type="submit">${t('save')}</button></form>`;
