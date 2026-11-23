import { html } from './dom.js';
import { t } from '../i18n/index.js';
import { money } from '../domain/format.js';

export const pbar = (p) =>
  html`<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p)}"><i style="width:${Math.max(0, Math.min(100, p))}%"></i></div>`;
export const bar = (value, max) => (max > 0 ? pbar((value / max) * 100) : '');
export const chip = (text, cls = '') => html`<span class="chip ${cls}">${text}</span>`;
export const kv = (k, v) => html`<div class="row kv"><span class="mut">${k}</span><span class="val">${v}</span></div>`;
export const fld = (label, control, hint) =>
  html`<label class="fld"><span>${label}</span>${control}${hint ? html`<small class="mut">${hint}</small>` : ''}</label>`;
export const opts = (list, selected) =>
  list.map(([v, l]) => html`<option value="${v}" ${String(v) === String(selected ?? '') ? 'selected' : ''}>${l}</option>`);
export const check = (name, label, on, disabled = false) =>
  html`<label class="chk"><input type="checkbox" name="${name}" ${on ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span>${label}</span></label>`;

export const header = (title, { back = false, right = '' } = {}) =>
  html`<header class="top">${back ? html`<button class="ib" data-act="back" aria-label="${t('back')}">‹</button>` : ''}<h1>${title}</h1>${right}</header>`;

export const fab = (label, act, id = '') => html`<div class="fabw"><button class="fab" data-act="${act}" data-id="${id}">+ ${label}</button></div>`;
export const seg = (options, current, act) =>
  html`<div class="seg" role="group">${options.map(([v, l]) => html`<button type="button" class="${v === current ? 'on' : ''}" aria-pressed="${v === current}" data-act="${act}" data-id="${v}">${l}</button>`)}</div>`;
export const pills = (options, current, act) =>
  html`<div class="pills">${options.map(([v, l]) => html`<button type="button" class="pill ${v === current ? 'on' : ''}" aria-pressed="${v === current}" data-act="${act}" data-id="${v}">${l}</button>`)}</div>`;

export const bellBtn = (c) => {
  const n = c.s.notes.filter((x) => !x.read).length + c.s.invites.length;
  return html`<button class="ib bell" data-act="notes-open" aria-label="${t('notifications')}">🔔${n ? html`<span class="badge">${n}</span>` : ''}</button>`;
};

export const signedImg = (bucket, path, cls = 'photo') =>
  path ? html`<img class="${cls}" data-signed="${bucket}|${path}" alt="" loading="lazy">` : '';

const PAL = ['#0E5A4B', '#B45309', '#3B82C4', '#8E5BD0', '#C0392B', '#6B7F3A'];

export function donut(entries) {
  const total = entries.reduce((s, e) => s + e[1], 0) || 1;
  let acc = 0;
  const stops = entries.map((e, i) => {
    const from = (acc / total) * 100;
    acc += e[1];
    return `${PAL[i % 6]} ${from.toFixed(2)}% ${((acc / total) * 100).toFixed(2)}%`;
  });
  return html`<div class="donutw"><div class="donut" role="img" aria-label="chart" style="background:conic-gradient(${stops.join(',') || 'var(--track) 0 100%'})"></div>
    <ul class="legend">${entries.map((e, i) => html`<li><span><i style="background:${PAL[i % 6]}"></i>${e[0]}</span><b>${money(e[1])}</b></li>`)}</ul></div>`;
}

export function columns(entries, h = 90) {
  const max = Math.max(1, ...entries.map((e) => e[1]));
  return html`<div class="cols">${entries.map((e) => html`<div class="col"><div class="colbar" title="${money(e[1])}" style="height:${Math.max(3, (e[1] / max) * h)}px"></div><span>${e[0]}</span></div>`)}</div>`;
}

export function rowsChart(entries) {
  if (!entries.length) return html`<div class="mut">${t('no_data')}</div>`;
  const max = Math.max(1, ...entries.map((e) => e[1]));
  return entries.map((e) => html`<div class="rc"><div class="row"><span>${e[0]}</span><b>${money(e[1])}</b></div>${pbar((e[1] / max) * 100)}</div>`);
}
