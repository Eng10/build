import { html } from '../dom.js';
import { t } from '../../i18n/index.js';
import { header, fld, opts, chip, kv, bar, pbar, fab } from '../components.js';
import { money } from '../../domain/format.js';
import { today, daysBetween } from '../../domain/dates.js';
import { spentOnStage, spentOnItem, paidOnly } from '../../domain/reports.js';
import { payRow } from './payments.js';

export function stageView(c) {
  const s = c.d.stages.find((x) => x.id === c.s.route.id);
  if (!s) return null;
  const items = c.d.items.filter((i) => i.stage_id === s.id);
  const pays = c.hidden ? [] : c.d.payments.filter((p) => p.stage_id === s.id);
  const spent = spentOnStage(c.d.payments, s.id);
  const dur = s.start_date && s.end_date ? daysBetween(s.start_date, s.end_date) : null;
  const left = s.end_date && s.status !== 'done' ? daysBetween(today(), s.end_date) : null;
  return html`${header(s.name, {
    back: true,
    right: c.caps.edit ? html`<button class="ib" data-act="stage-edit" data-id="${s.id}" aria-label="${t('edit')}">✎</button><button class="ib" data-act="item-new" data-id="${s.id}" aria-label="${t('item_add')}">＋</button>` : '',
  })}
    <div class="card"><div class="row">${chip(t('status_' + s.status))}<b>${s.progress !== null && s.progress !== undefined ? `${s.progress}%` : ''}</b></div>
      ${s.progress !== null && s.progress !== undefined ? pbar(s.progress) : ''}
      ${kv(t('period'), s.start_date && s.end_date ? `${s.start_date} → ${s.end_date}` : '—')}
      ${dur !== null ? kv(t('duration'), `${dur} ${t('days_unit')}`) : ''}
      ${left !== null ? kv(t('remaining'), left >= 0 ? `${left} ${t('days_unit')}` : t('overdue')) : ''}
      ${s.done_on ? kv(t('completed_on'), s.done_on) : ''}
      ${c.hidden ? '' : kv(t('stage_total'), `${money(spent)} ${t('cur')}`)}${!c.hidden && s.budget > 0 ? kv(t('stage_budget'), `${money(s.budget)} ${t('cur')}`) : ''}</div>
    <h2>${t('items')}</h2>
    ${items.length
      ? items.map((i) => {
          const v = spentOnItem(c.d.payments, i.id);
          const inner = html`<div class="row"><b>${i.name}</b>${c.hidden ? '' : html`<b>${money(v)}${i.budget > 0 ? ` / ${money(i.budget)}` : ''}</b>`}</div>${c.hidden ? '' : bar(v, i.budget)}`;
          return c.caps.edit ? html`<button class="card" data-act="item-edit" data-id="${i.id}">${inner}</button>` : html`<div class="card">${inner}</div>`;
        })
      : html`<div class="mut">${t('no_items')}</div>`}
    ${c.hidden ? '' : html`<h2>${t('payments')}</h2>${pays.length ? pays.map((x) => payRow(c, x)) : html`<div class="mut">${t('pay_none')}</div>`}`}
    ${c.caps.edit ? fab(t('pay_add'), 'pay-new', s.id) : ''}`;
}

export const stageForm = (s) => html`<h3>${t(s ? 'stage_edit' : 'stage_add')}</h3>
  <form data-form="stage" data-id="${s?.id ?? ''}">
    ${fld(t('stage_name'), html`<input name="name" required maxlength="120" value="${s?.name ?? ''}">`)}
    <div class="two">${fld(t('start'), html`<input name="start" type="date" value="${s?.start_date ?? ''}">`)}${fld(t('end'), html`<input name="end" type="date" value="${s?.end_date ?? ''}">`)}</div>
    ${fld(t('status_label'), html`<select name="status">${opts(['todo', 'doing', 'done'].map((k) => [k, t('status_' + k)]), s?.status ?? 'todo')}</select>`)}
    ${fld(t('stage_budget') + ' (' + t('cur') + ')', html`<input name="budget" inputmode="decimal" value="${s?.budget ?? ''}">`, t('budget_hint'))}
    <button class="btn" type="submit">${t('save')}</button>
    ${s ? html`<button type="button" class="btn d" data-act="ask-delete" data-kind="stage" data-id="${s.id}">${t('stage_delete')}</button>` : ''}</form>`;

export const itemForm = (item, stageId) => html`<h3>${t(item ? 'item_edit' : 'item_add')}</h3>
  <form data-form="item" data-id="${item?.id ?? ''}" data-stage="${item?.stage_id ?? stageId ?? ''}">
    ${fld(t('item_name'), html`<input name="name" required maxlength="120" value="${item?.name ?? ''}">`)}
    ${fld(t('item_budget') + ' (' + t('cur') + ')', html`<input name="budget" inputmode="decimal" value="${item?.budget ?? ''}">`)}
    <button class="btn" type="submit">${t('save')}</button>
    ${item ? html`<button type="button" class="btn d" data-act="ask-delete" data-kind="item" data-id="${item.id}">${t('item_delete')}</button>` : ''}</form>`;
