import { html } from '../dom.js';
import { t } from '../../i18n/index.js';
import { header, fld, opts, seg, chip, fab, gallery, fileInput, existingFiles } from '../components.js';
import { kindOf } from '../../domain/files.js';

export const nameOf = (c, uid) => c.d.members.find((m) => m.user_id === uid)?.profile?.name ?? '—';
export const attsOf = (c, kind, id) => (c.d.attachments ?? []).filter((a) => a.owner_kind === kind && a.owner_id === id);
const STATUSES = ['open', 'in_progress', 'resolved'];

export function siteView(c) {
  const tab = c.s.route.site || 'updates';
  const head = html`${header(t('site'))}${seg([['updates', t('updates')], ['visits', t('visits')]], tab, 'site-tab')}`;
  if (tab === 'updates') {
    return html`${head}${c.d.updates.length
      ? c.d.updates.map((u) => html`<article class="card"><div class="row"><b>${u.title}</b>
          ${c.caps.edit && (u.created_by === c.uid || c.caps.manage) ? html`<button class="chip btnchip" data-act="upd-edit" data-id="${u.id}">${t('edit')}</button>` : ''}</div>
          <div class="mut">${u.posted_on} · ${t('by')} ${nameOf(c, u.created_by)}</div>${gallery(attsOf(c, 'update', u.id))}<p class="body">${u.body}</p></article>`)
      : html`<div class="mut">${t('updates_none')}</div>`}${c.caps.edit ? fab(t('update_new'), 'upd-new') : ''}`;
  }
  if (!c.caps.visits) return html`${head}<div class="note">🔒 ${t('visits_locked')}</div>`;
  return html`${head}${c.d.issues.length
    ? c.d.issues.map((i) => {
        const files = attsOf(c, 'issue', i.id);
        const first = files.find((a) => kindOf(a.mime) === 'image');
        const n = c.d.messages.filter((m) => m.issue_id === i.id).length;
        return html`<button class="card row issue" data-act="open" data-sub="issue" data-id="${i.id}">
          ${first ? html`<img class="thumb" data-signed="${first.bucket}|${first.path}" alt="" loading="lazy">` : html`<span class="ph">${files.length ? '📎' : '📷'}</span>`}
          <div class="grow"><b>${i.title}</b><div class="mut">${c.d.stages.find((s) => s.id === i.stage_id)?.name ?? ''} · ${i.created_at.slice(0, 10)}${files.length ? ` · 📎 ${files.length}` : ''}</div></div>
          <div class="end">${chip(t('issue_' + i.status))}<div class="mut">💬 ${n}</div></div></button>`;
      })
    : html`<div class="mut">${t('issues_none')}</div>`}${fab(t('issue_new'), 'issue-new')}`;
}

export function issueView(c) {
  const i = c.d.issues.find((x) => x.id === c.s.route.id);
  if (!i) return null;
  const msgs = c.d.messages.filter((m) => m.issue_id === i.id);
  return html`${header(i.title, { back: true })}
    <div class="card">${gallery(attsOf(c, 'issue', i.id))}<p class="body">${i.description}</p>
      <div class="mut">${c.d.stages.find((s) => s.id === i.stage_id)?.name ?? ''} · ${i.created_at.slice(0, 10)} · ${t('by')} ${nameOf(c, i.created_by)}</div>
      <label class="fld"><span>${t('status_label')}</span><select data-change="issue-status" data-id="${i.id}" ${c.caps.edit ? '' : 'disabled'}>${opts(STATUSES.map((k) => [k, t('issue_' + k)]), i.status)}</select></label></div>
    ${msgs.map((m) => html`<div class="bub ${m.created_by === c.uid ? 'me' : ''}"><div class="mut">${nameOf(c, m.created_by)} · ${m.created_at.slice(0, 16).replace('T', ' ')}</div>
      ${gallery(attsOf(c, 'message', m.id))}${m.body ? html`<div class="body">${m.body}</div>` : ''}</div>`)}
    <form data-form="message" data-id="${i.id}" class="card">
      ${fld(t('reply'), html`<textarea name="body" rows="2" maxlength="2000"></textarea>`)}
      ${fileInput(t('photo'))}
      <button class="btn" type="submit">${t('send')}</button></form>
    ${c.caps.manage ? html`<button class="btn d" data-act="ask-delete" data-kind="issue" data-id="${i.id}">${t('issue_delete')}</button>` : ''}`;
}

export const updateForm = (c, u) => html`<h3>${t(u ? 'update_edit' : 'update_new')}</h3>
  <form data-form="update" data-id="${u?.id ?? ''}">
    ${fld(t('title'), html`<input name="title" required maxlength="160" value="${u?.title ?? ''}">`)}
    ${fld(t('body'), html`<textarea name="body" rows="5">${u?.body ?? ''}</textarea>`)}
    ${fld(t('date'), html`<input name="date" type="date" value="${u?.posted_on ?? ''}">`)}
    ${u ? existingFiles(attsOf(c, 'update', u.id)) : ''}${fileInput()}
    <button class="btn" type="submit">${t('save')}</button>
    ${u ? html`<button type="button" class="btn d" data-act="ask-delete" data-kind="update" data-id="${u.id}">${t('update_delete')}</button>` : ''}</form>`;

export const issueForm = (c) => html`<h3>${t('issue_new')}</h3>
  <form data-form="issue" data-id="">
    ${fld(t('title'), html`<input name="title" required maxlength="160">`)}
    ${fld(t('description'), html`<textarea name="description" rows="3"></textarea>`)}
    ${fld(t('related_stage'), html`<select name="stage_id">${opts([['', t('none')], ...c.d.stages.map((s) => [s.id, s.name])], '')}</select>`)}
    ${fileInput()}
    <button class="btn" type="submit">${t('save')}</button></form>`;