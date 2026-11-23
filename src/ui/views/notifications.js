import { html } from '../dom.js';
import { t } from '../../i18n/index.js';
import { header, chip } from '../components.js';
import { money } from '../../domain/format.js';
import { invitesList } from './projects.js';

export function noteText(n) {
  const d = n.data ?? {};
  return t('n_' + n.kind, { amount: money(d.amount), stage: d.stage, due: d.due, title: d.title, project: d.project, user: d.user, role: d.role ? t('role_' + d.role) : '' });
}

export function notesView(c) {
  const unread = c.s.notes.some((n) => !n.read);
  return html`${header(t('notifications'), { back: true, right: unread ? html`<button class="chip btnchip" data-act="notes-readall">${t('notes_read_all')}</button>` : '' })}
    ${invitesList(c)}
    ${c.s.notes.length
      ? c.s.notes.map((n) => html`<button class="card ${n.read ? 'dim' : ''}" data-act="note-read" data-id="${n.id}"><div>${n.read ? '' : '● '}${noteText(n)}</div><div class="mut">${n.created_at.slice(0, 16).replace('T', ' ')}</div></button>`)
      : c.s.invites.length ? '' : html`<div class="mut">${t('notes_none')}</div>`}`;
}
