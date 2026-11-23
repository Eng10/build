import { html } from '../dom.js';
import { t } from '../../i18n/index.js';
import { header, fld, opts, chip, kv } from '../components.js';
import { money } from '../../domain/format.js';
import { today } from '../../domain/dates.js';

const KINDS = ['materials', 'labor', 'fees', 'other'];
const METHODS = ['cash', 'transfer', 'check'];

export function payRow(c, x) {
  const ct = c.d.contractors.find((k) => k.id === x.contractor_id);
  const who = ct ? ct.name : x.payee || t('method_' + x.method);
  return html`<button class="card row" data-act="open" data-sub="payment" data-id="${x.id}"><div><div class="b">${who}</div>
    <div class="mut">${x.paid_on} · ${t('method_' + x.method)}${x.receipt_path ? ' · 📎' : ''} ${x.status === 'scheduled' ? chip(t('pay_scheduled')) : ''}</div></div>
    <b>${money(x.amount)}</b></button>`;
}

export function paymentView(c) {
  const x = c.d.payments.find((p) => p.id === c.s.route.id);
  if (!x) return null;
  const stage = c.d.stages.find((s) => s.id === x.stage_id);
  const item = c.d.items.find((i) => i.id === x.item_id);
  const ct = c.d.contractors.find((k) => k.id === x.contractor_id);
  const vat = Number(x.vat_rate) > 0 ? Number(x.amount) - Number(x.amount) / (1 + Number(x.vat_rate) / 100) : null;
  return html`${header(t('pay_details'), { back: true, right: c.caps.edit ? html`<button class="ib" data-act="pay-edit" data-id="${x.id}" aria-label="${t('edit')}">✎</button>` : '' })}
    <div class="card"><b class="big">${money(x.amount)} ${t('cur')}</b>
      ${chip(t(x.status === 'paid' ? 'pay_paid' : 'pay_scheduled'))}
      ${kv(t('stage'), stage?.name ?? '—')}${item ? kv(t('item'), item.name) : ''}${ct ? kv(t('contractors'), ct.name) : ''}${x.payee ? kv(t('payee'), x.payee) : ''}
      ${kv(t('kind_label'), t('kind_' + x.kind))}${kv(t('method_label'), t('method_' + x.method))}${kv(x.status === 'paid' ? t('date') : t('due_date'), x.paid_on)}
      ${x.invoice_no ? kv(t('invoice_no'), x.invoice_no) : ''}${vat !== null ? kv(t('vat'), `${x.vat_rate}% · ${money(vat)} ${t('cur')}`) : ''}${x.note ? kv(t('note'), x.note) : ''}</div>
    <h2>${t('receipt')}</h2><div class="card">
      ${x.receipt_path
        ? html`<button class="btn" data-act="file-view" data-bucket="receipts" data-path="${x.receipt_path}">${t('receipt_view')}</button>`
        : html`<div class="mut">${t('receipt_none')}</div>`}</div>
    ${x.status === 'scheduled' && c.caps.edit ? html`<button class="btn" data-act="pay-markpaid" data-id="${x.id}">✓ ${t('mark_paid')}</button>` : ''}
    ${c.caps.edit ? html`<button class="btn d" data-act="ask-delete" data-kind="payment" data-id="${x.id}">${t('pay_delete')}</button>` : ''}`;
}

export function paymentForm(c, x, stageId) {
  const cur = x?.stage_id ?? stageId ?? c.d.stages[0]?.id;
  const items = c.d.items.filter((i) => i.stage_id === cur);
  const pickItems = (list, sel) => [['', t('none')], ...list.map((i) => [i.id, i.name])].map(([v, l]) => html`<option value="${v}" ${v === (sel ?? '') ? 'selected' : ''}>${l}</option>`);
  return html`<h3>${t(x ? 'pay_edit' : 'pay_add')}</h3>
    <form data-form="payment" data-id="${x?.id ?? ''}">
      ${fld(t('amount') + ' (' + t('cur') + ')', html`<input name="amount" required inputmode="decimal" class="amount" value="${x?.amount ?? ''}" autocomplete="off">`)}
      <div class="two">${fld(t('pay_status'), html`<select name="status">${opts([['paid', t('pay_paid')], ['scheduled', t('pay_scheduled')]], x?.status ?? 'paid')}</select>`)}
      ${fld(t('date'), html`<input name="date" type="date" required value="${x?.paid_on ?? today()}">`)}</div>
      ${fld(t('stage'), html`<select name="stage_id" required data-change="pay-stage">${opts(c.d.stages.map((s) => [s.id, s.name]), cur)}</select>`)}
      ${fld(t('item'), html`<select name="item_id">${pickItems(items, x?.item_id)}</select>`)}
      ${fld(t('item_new_inline'), html`<input name="new_item" maxlength="120">`)}
      <div class="two">${fld(t('kind_label'), html`<select name="kind">${opts(KINDS.map((k) => [k, t('kind_' + k)]), x?.kind ?? 'materials')}</select>`)}
      ${fld(t('vat'), html`<select name="vat_rate">${opts([[0, '0%'], [15, '15%']], Number(x?.vat_rate ?? 0))}</select>`)}</div>
      ${fld(t('contractor_opt'), html`<select name="contractor_id">${opts([['', t('contractor_none')], ...c.d.contractors.map((k) => [k.id, k.name])], x?.contractor_id)}</select>`)}
      ${fld(t('payee'), html`<input name="payee" maxlength="120" placeholder="${t('payee_hint')}" value="${x?.payee ?? ''}">`)}
      ${fld(t('method_label'), html`<select name="method">${opts(METHODS.map((m) => [m, t('method_' + m)]), x?.method ?? 'transfer')}</select>`)}
      <div class="two">${fld(t('invoice_no'), html`<input name="invoice_no" maxlength="60" value="${x?.invoice_no ?? ''}">`)}
      ${fld(t('note'), html`<input name="note" maxlength="300" value="${x?.note ?? ''}">`)}</div>
      ${fld(x?.receipt_path ? t('receipt_replace') : t('receipt_attach'), html`<input name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf">`)}
      <button class="btn" type="submit">${t('save')}</button></form>`;
}

export const itemOptions = (c, stageId, selected) =>
  [['', t('none')], ...c.d.items.filter((i) => i.stage_id === stageId).map((i) => [i.id, i.name])]
    .map(([v, l]) => html`<option value="${v}" ${v === (selected ?? '') ? 'selected' : ''}>${l}</option>`);
