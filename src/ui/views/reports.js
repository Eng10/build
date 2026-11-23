import { html } from '../dom.js';
import { t } from '../../i18n/index.js';
import { header, pills, donut, columns, rowsChart, bar } from '../components.js';
import { money } from '../../domain/format.js';
import { today } from '../../domain/dates.js';
import { PERIOD_KEYS, filterPeriod, summary, groupSum, monthly } from '../../domain/reports.js';
import { payRow } from './payments.js';

function compute(c) {
  const period = c.s.route.period || 'all';
  const rows = filterPeriod(c.d.payments, period, today());
  const name = (list, id) => list.find((x) => x.id === id)?.name ?? '—';
  return {
    period,
    rows,
    sm: summary(rows, c.project.budget),
    byStage: groupSum(rows, (r) => name(c.d.stages, r.stage_id)),
    byContractor: groupSum(rows.filter((r) => r.contractor_id), (r) => name(c.d.contractors, r.contractor_id)),
    byMethod: groupSum(rows, (r) => t('method_' + r.method)),
    byKind: groupSum(rows, (r) => t('kind_' + r.kind)),
    months: monthly(rows).map(([k, v]) => [k.slice(2), v]),
  };
}

export function reportsView(c) {
  const head = html`${header(t('reports'))}${pills(PERIOD_KEYS.map((k) => [k, t('period_' + k)]), c.s.route.period || 'all', 'rep-period')}`;
  if (c.hidden) return html`${head}<div class="note">🔒 ${t('reports_locked')}</div>`;
  const r = compute(c);
  return html`${head}
    <section class="hero"><div class="mut2">${t('summary')} · ${t('period_' + r.period)}</div><b>${money(r.sm.total)} ${t('cur')}</b>${bar(r.sm.total, c.project.budget)}
      <div class="small">${r.sm.share !== null ? `${Math.round(r.sm.share)}% ${t('of_budget')} · ` : ''}${t('budget')} ${money(c.project.budget)}</div></section>
    <div class="tiles"><div class="card"><div class="mut">${t('count')}</div><b class="big">${r.sm.count}</b></div>
      <div class="card"><div class="mut">${t('average')}</div><b class="big">${money(r.sm.avg)}</b></div>
      <div class="card"><div class="mut">${t('largest')}</div><b class="big">${money(r.sm.max)}</b></div></div>
    <h2>${t('by_month')}</h2><div class="card">${r.months.length ? columns(r.months) : html`<div class="mut">${t('no_data')}</div>`}</div>
    <h2>${t('by_method')}</h2><div class="card">${r.byMethod.length ? donut(r.byMethod) : html`<div class="mut">${t('no_data')}</div>`}</div>
    <h2>${t('by_kind')}</h2><div class="card">${r.byKind.length ? donut(r.byKind) : html`<div class="mut">${t('no_data')}</div>`}</div>
    <h2>${t('by_stage')}</h2><div class="card">${rowsChart(r.byStage)}</div>
    <h2>${t('by_contractor')}</h2><div class="card">${rowsChart(r.byContractor)}</div>
    <h2>${t('top_payments')}</h2>${[...r.rows].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5).map((x) => payRow(c, x))}
    <button class="btn o" data-act="rep-copy">${t('copy_summary')}</button>`;
}

export function summaryText(c) {
  const r = compute(c);
  const lines = [`${c.project.name} · ${t('period_' + r.period)}`, `${t('total')}: ${money(r.sm.total)} ${t('cur')} (${r.sm.count})`, `${t('budget')}: ${money(c.project.budget)} ${t('cur')}`, ''];
  r.byStage.forEach(([k, v]) => lines.push(`${k}: ${money(v)} ${t('cur')}`));
  return lines.join('\n');
}
