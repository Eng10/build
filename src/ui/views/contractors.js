import { html } from '../dom.js';
import { t } from '../../i18n/index.js';
import { header, fld, bar, donut, kv, fab } from '../components.js';
import { money } from '../../domain/format.js';
import { paidToContractor } from '../../domain/reports.js';
import { payRow } from './payments.js';

export function contractorsView(c) {
  const list = c.d.contractors;
  const total = list.reduce((s, k) => s + Number(k.contract_value ?? 0), 0);
  const paid = list.reduce((s, k) => s + paidToContractor(c.d.payments, k.id), 0);
  return html`${header(t('contractors'))}
    ${c.hidden
      ? html`<div class="note">🔒 ${t('hidden_amounts')}</div>`
      : html`<div class="card"><div class="row center3"><div><div class="mut">${t('contracts_total')}</div><b>${money(total)}</b></div><div><div class="mut">${t('paid')}</div><b>${money(paid)}</b></div><div><div class="mut">${t('due')}</div><b>${money(total - paid)}</b></div></div></div>
        ${list.length ? html`<div class="card"><div class="mut">${t('paid_vs_due')}</div>${donut([[t('paid'), paid], [t('due'), Math.max(0, total - paid)]])}</div>` : ''}`}
    ${list.length
      ? list.map((k) => {
          const paidK = paidToContractor(c.d.payments, k.id);
          return html`<button class="card" data-act="open" data-sub="contractor" data-id="${k.id}"><div class="row"><b>${k.name}</b>${k.contract_path ? html`<span class="chip">📄 PDF</span>` : ''}</div>
            <div class="mut">${k.trade ?? ''}</div>
            ${c.hidden ? '' : html`<div class="row small"><span>${t('contract_value')} <b>${money(k.contract_value)}</b></span><span>${t('paid')} <b>${money(paidK)}</b></span><span>${t('due')} <b>${money(k.contract_value - paidK)}</b></span></div>${bar(paidK, k.contract_value)}`}</button>`;
        })
      : html`<div class="mut">${t('contractor_none_yet')}</div>`}
    ${c.caps.edit ? fab(t('contractor_add'), 'ctr-new') : ''}`;
}

export function contractorView(c) {
  const k = c.d.contractors.find((x) => x.id === c.s.route.id);
  if (!k) return null;
  const paid = paidToContractor(c.d.payments, k.id);
  const pays = c.hidden ? [] : c.d.payments.filter((p) => p.contractor_id === k.id);
  return html`${header(k.name, { back: true, right: c.caps.edit ? html`<button class="ib" data-act="ctr-edit" data-id="${k.id}" aria-label="${t('edit')}">✎</button>` : '' })}
    <div class="card"><div class="mut">${k.trade ?? ''}</div>
      ${k.phone ? kv(t('phone'), html`<bdi dir="ltr">${k.phone}</bdi>`) : ''}${k.start_date || k.end_date ? kv(t('period'), `${k.start_date ?? '—'} → ${k.end_date ?? '—'}`) : ''}
      ${c.hidden ? '' : html`${kv(t('contract_value'), `${money(k.contract_value)} ${t('cur')}`)}${kv(t('paid'), `${money(paid)} ${t('cur')}`)}${kv(t('due'), `${money(k.contract_value - paid)} ${t('cur')}`)}${bar(paid, k.contract_value)}`}</div>
    <h2>${t('scope')}</h2><div class="card">${k.scope?.length ? k.scope.map((x) => html`<div class="li">• ${x}</div>`) : '—'}</div>
    <h2>${t('contract_file')}</h2><div class="card">
      ${k.contract_path
        ? html`<button class="btn" data-act="file-view" data-bucket="contracts" data-path="${k.contract_path}">${t('contract_view')}</button>
            ${c.caps.edit ? html`<button class="btn d" data-act="ctr-file-remove" data-id="${k.id}">${t('contract_remove')}</button>` : ''}`
        : html`<div class="mut">${t('contract_none')}</div>`}</div>
    ${c.hidden ? '' : html`<h2>${t('contractor_payments')}</h2>${pays.length ? pays.map((x) => payRow(c, x)) : html`<div class="mut">${t('pay_none')}</div>`}`}
    ${c.caps.edit ? html`<button class="btn d" data-act="ask-delete" data-kind="contractor" data-id="${k.id}">${t('contractor_delete')}</button>` : ''}`;
}

export const contractorForm = (k) => html`<h3>${t(k ? 'contractor_edit' : 'contractor_add')}</h3>
  <form data-form="contractor" data-id="${k?.id ?? ''}">
    ${fld(t('contractor_name'), html`<input name="name" required maxlength="120" value="${k?.name ?? ''}">`)}
    ${fld(t('trade'), html`<input name="trade" maxlength="120" value="${k?.trade ?? ''}">`)}
    ${fld(t('phone'), html`<input name="phone" type="tel" dir="ltr" inputmode="tel" value="${k?.phone ?? ''}">`)}
    ${fld(t('scope'), html`<textarea name="scope" rows="4">${(k?.scope ?? []).join('\n')}</textarea>`, t('scope_hint'))}
    ${fld(t('contract_value') + ' (' + t('cur') + ')', html`<input name="value" inputmode="decimal" value="${k?.contract_value ?? ''}">`)}
    <div class="two">${fld(t('start'), html`<input name="start" type="date" value="${k?.start_date ?? ''}">`)}${fld(t('end'), html`<input name="end" type="date" value="${k?.end_date ?? ''}">`)}</div>
    ${fld(k?.contract_path ? t('receipt_replace') : t('contract_attach'), html`<input name="file" type="file" accept="application/pdf">`)}
    <button class="btn" type="submit">${t('save')}</button></form>`;
