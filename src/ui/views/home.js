import { html } from '../dom.js';
import { t } from '../../i18n/index.js';
import { header, bellBtn, bar, pbar, chip, columns, fab } from '../components.js';
import { money } from '../../domain/format.js';
import { today, daysBetween } from '../../domain/dates.js';
import { paidOnly, sumAmount, monthly, upcoming, timeline, spentOnStage } from '../../domain/reports.js';

export function stageRow(c, s) {
  const spent = c.hidden ? null : spentOnStage(c.d.payments, s.id);
  return html`<button class="card" data-act="open" data-sub="stage" data-id="${s.id}">
    <div class="row"><b>${s.name}</b>${chip(t('status_' + s.status))}</div>
    <div class="mut">${s.start_date && s.end_date ? `${s.start_date} → ${s.end_date}` : t('no_dates')}${c.hidden ? '' : ` · ${money(spent)} ${t('cur')}`}</div>
    ${s.progress !== null && s.progress !== undefined ? pbar(s.progress) : ''}</button>`;
}

export function homeView(c) {
  const { project: p, d, caps, hidden } = c;
  const spent = sumAmount(paidOnly(d.payments));
  const tl = timeline(p, today());
  const up = hidden ? [] : upcoming(d.payments);
  const months = monthly(paidOnly(d.payments)).slice(-6).map(([k, v]) => [k.slice(5), v]);
  const stageName = (id) => d.stages.find((s) => s.id === id)?.name ?? '';
  return html`${header(html`<button class="sw" data-act="project-switch">${p.name} ▾</button>`, { right: bellBtn(c) })}
    ${hidden
      ? html`<div class="note">🔒 ${t('hidden_amounts')}</div>`
      : html`<section class="hero"><div class="mut2">${t('spent')}</div><b>${money(spent)} ${t('cur')}</b>${bar(spent, p.budget)}
          ${p.budget > 0 ? html`<div class="small">${t('budget')} ${money(p.budget)} · ${t('remaining')} ${money(p.budget - spent)} ${t('cur')}</div>` : ''}</section>`}
    <div class="tiles">
      ${p.progress !== null && p.progress !== undefined ? html`<div class="card"><div class="mut">${t('progress')}</div><b class="big">${p.progress}%</b>${pbar(p.progress)}</div>` : ''}
      ${tl ? html`<div class="card"><div class="mut">${t('time_left')}</div><b class="big">${tl.left >= 0 ? `${tl.left} ${t('days_unit')}` : t('overdue')}</b>${pbar(tl.elapsed)}</div>` : ''}
    </div>
    ${!hidden && months.length ? html`<h2>${t('last6')}</h2><div class="card">${columns(months)}</div>` : ''}
    <h2>${t('upcoming')}</h2>
    ${up.length
      ? up.map((x) => {
          const left = daysBetween(today(), x.paid_on);
          return html`<div class="card row"><div><div>${stageName(x.stage_id)} · ${money(x.amount)} ${t('cur')}</div>
            <div class="mut">${x.paid_on} · <span class="${left < 0 ? 'late' : ''}">${left < 0 ? t('overdue') : `${left} ${t('days_unit')}`}</span></div></div>
            ${caps.edit ? html`<button class="chip btnchip" data-act="pay-markpaid" data-id="${x.id}">✓ ${t('mark_paid')}</button>` : ''}</div>`;
        })
      : html`<div class="mut">${t('nothing_upcoming')}</div>`}
    <div class="row"><h2>${t('stages')}</h2>${caps.edit ? html`<button class="chip btnchip" data-act="stage-new">+ ${t('stage_add')}</button>` : ''}</div>
    ${d.stages.map((s) => stageRow(c, s))}
    ${caps.edit ? fab(t('pay_add'), 'pay-new') : ''}`;
}
