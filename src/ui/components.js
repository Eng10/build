import { html } from './dom.js';
import { t } from '../i18n/index.js';
import { money } from '../domain/format.js';
import { kindOf, formatSize } from '../domain/files.js';

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

// ---- المرفقات: معرض صور وفيديو + قائمة ملفات + نافذة استعراض --------------------------
export const ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,application/pdf,.doc,.docx,.xls,.xlsx,.txt';

export const fileInput = (label = t('att_label')) =>
  fld(label, html`<input name="files" type="file" multiple accept="${ACCEPT}">`, t('att_hint'));

// قائمة المرفقات الحالية في نموذج التعديل (علامة = إزالة عند الحفظ)
export const existingFiles = (list) =>
  list.length
    ? html`<div class="fld"><span>${t('att_current')}</span>${list.map((a) => html`<label class="chk"><input type="checkbox" name="remove" value="${a.id}"><span>${a.name} · ${t('att_remove')}</span></label>`)}</div>`
    : '';

export function gallery(list) {
  if (!list?.length) return '';
  const media = list.filter((a) => kindOf(a.mime) !== 'file');
  const files = list.filter((a) => kindOf(a.mime) === 'file');
  return html`${media.length
    ? html`<div class="gal ${media.length === 1 ? 'one' : ''}">${media.map((a) =>
        kindOf(a.mime) === 'image'
          ? html`<button class="gtile" data-act="att-open" data-id="${a.id}" aria-label="${a.name}"><img data-signed="${a.bucket}|${a.path}" alt="" loading="lazy"></button>`
          : html`<button class="gtile vid" data-act="att-open" data-id="${a.id}" aria-label="${a.name}"><span class="play" aria-hidden="true">▶</span><small>${a.name}</small></button>`)}</div>`
    : ''}${files.length
    ? html`<div class="gfiles">${files.map((a) => html`<button class="gfile" data-act="att-open" data-id="${a.id}"><span class="fi" aria-hidden="true">${a.mime === 'application/pdf' ? '📄' : '📎'}</span><span class="grow">${a.name}<small class="mut block">${formatSize(a.size)}</small></span></button>`)}</div>`
    : ''}`;
}

export function viewerSheet(a, url, i, n) {
  const kind = kindOf(a.mime);
  return html`<div class="row"><b class="vname">${a.name}</b><span class="mut">${i + 1} / ${n}</span></div>
    ${kind === 'image' ? html`<img class="vmedia" src="${url}" alt="${a.name}">`
      : kind === 'video' ? html`<video class="vmedia" src="${url}" controls playsinline preload="metadata"></video>`
      : a.mime === 'application/pdf' ? html`<iframe class="pdf" src="${url}" title="${a.name}"></iframe>`
      : html`<div class="note">${a.name}${a.size ? ` · ${formatSize(a.size)}` : ''}</div>`}
    ${n > 1 ? html`<div class="two"><button class="btn o" data-act="att-nav" data-dir="-1">${t('att_prev')}</button><button class="btn o" data-act="att-nav" data-dir="1">${t('att_next')}</button></div>` : ''}
    <a class="btn o" href="${url}" target="_blank" rel="noopener noreferrer">${t('att_download')}</a>
    <button class="btn" data-act="sheet-close">${t('close')}</button>`;
}