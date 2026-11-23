import { html, raw } from './dom.js';
import { t } from '../i18n/index.js';
import { makeContext } from '../state/store.js';
import { authView, recoveryView, configView } from './views/auth.js';
import { noProjectView } from './views/projects.js';
import { homeView } from './views/home.js';
import { stageView } from './views/stage.js';
import { paymentView } from './views/payments.js';
import { contractorsView, contractorView } from './views/contractors.js';
import { reportsView } from './views/reports.js';
import { siteView, issueView } from './views/site.js';
import { teamView } from './views/team.js';
import { notesView } from './views/notifications.js';
import { settingsView } from './views/settings.js';

const ICONS = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  contractors: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 5a3.5 3.5 0 0 1 0 6.5M18 14c2.2.6 3.5 2.4 3.5 6"/>',
  reports: '<path d="M4 20V10M10 20V4M16 20v-7M2 20h20"/>',
  site: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M21 16l-5-5-8 8"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
};
const TABS = ['home', 'contractors', 'reports', 'site', 'settings'];

const tabbar = (c) => html`<nav class="tabs" aria-label="Main">${TABS.map(
  (k) => html`<button class="tab ${c.s.route.tab === k ? 'on' : ''}" data-act="nav" data-id="${k}" ${c.s.route.tab === k ? 'aria-current="page"' : ''}>
    <svg viewBox="0 0 24 24" aria-hidden="true">${raw(ICONS[k])}</svg>${t('tab_' + k)}</button>`,
)}</nav>`;

// يحوّل الحالة إلى صفحة كاملة. دالة نقية بدون وصول للشبكة أو DOM.
export function view(s) {
  if (!s.configured) return configView();
  if (!s.ready) return html`<div class="center">${t('loading')}</div>`;
  if (s.recovery) return recoveryView();
  if (!s.session) return authView(s);
  const c = makeContext(s);
  if (!c.project) return html`<div class="page">${s.route.sub === 'notes' ? notesView(c) : noProjectView(c)}</div>`;
  const { tab, sub } = s.route;
  let body = null;
  if (sub === 'notes') body = notesView(c);
  else if (sub === 'stage') body = stageView(c);
  else if (sub === 'payment') body = c.hidden ? null : paymentView(c);
  else if (sub === 'contractor') body = contractorView(c);
  else if (sub === 'issue') body = c.caps.visits ? issueView(c) : null;
  else if (sub === 'team') body = teamView(c);
  if (!body) body = { home: homeView, contractors: contractorsView, reports: reportsView, site: siteView, settings: settingsView }[tab]?.(c) ?? homeView(c);
  return html`<div class="page">${body}</div>${tabbar(c)}`;
}
