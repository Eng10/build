import { html } from '../dom.js';
import { t } from '../../i18n/index.js';
import { header, fld, bellBtn } from '../components.js';
import { money } from '../../domain/format.js';

export const invitesList = (c) =>
  c.s.invites.map(
    (i) => html`<div class="card"><b>${i.project_name}</b>
      <div class="mut">${t('invited_as')} ${t('role_' + i.role)}${i.invited_by_name ? ` · ${i.invited_by_name}` : ''}</div>
      <div class="two"><button class="btn" data-act="invite-accept" data-id="${i.project_id}">${t('accept')}</button>
      <button class="btn o" data-act="invite-decline" data-id="${i.project_id}">${t('decline')}</button></div></div>`,
  );

export const noProjectView = (c) => html`${header(t('project_none'), { right: bellBtn(c) })}
  <div class="note">${t('project_none_hint')}</div>${invitesList(c)}
  <button class="btn" data-act="project-new">+ ${t('project_new')}</button>
  <button class="btn o" data-act="signout">${t('auth_signout')}</button>`;

export const switchSheet = (c) => html`<h3>${t('project_switch')}</h3>
  ${c.s.projects.map(
    (p) => html`<button class="card row" data-act="project-select" data-id="${p.id}"><span><b>${p.name}</b>
      ${p.costs_visible && p.budget > 0 ? html`<span class="mut block">${t('budget')} ${money(p.budget)} ${t('cur')}</span>` : ''}</span>
      ${p.id === c.s.projectId ? html`<span class="chip">✓</span>` : ''}</button>`,
  )}
  <button class="btn" data-act="project-new">+ ${t('project_new')}</button>`;

export const projectForm = (p) => html`<h3>${t(p ? 'project_edit' : 'project_new')}</h3>
  <form data-form="project" data-id="${p?.id ?? ''}">
    ${fld(t('project_name'), html`<input name="name" required maxlength="120" value="${p?.name ?? ''}">`)}
    ${fld(t('project_budget') + ' (' + t('cur') + ')', html`<input name="budget" inputmode="decimal" value="${p?.budget ?? ''}">`)}
    <div class="two">${fld(t('project_start'), html`<input name="start" type="date" value="${p?.start_date ?? ''}">`)}
    ${fld(t('project_end'), html`<input name="end" type="date" value="${p?.end_date ?? ''}">`)}</div>
    <button class="btn" type="submit">${t(p ? 'save' : 'project_new')}</button></form>`;
