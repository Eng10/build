// قوالب HTML آمنة: كل قيمة تُمرَّر داخل html`...` تُهرَّب تلقائياً (حماية من XSS)،
// إلا القيم الناتجة عن html`` نفسها أو raw().
const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export class Safe {
  constructor(s) {
    this.s = s;
  }
  toString() {
    return this.s;
  }
}

export const raw = (s) => new Safe(String(s ?? ''));
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => MAP[c]);

const part = (v) => {
  if (v instanceof Safe) return v.s;
  if (Array.isArray(v)) return v.map(part).join('');
  if (v === false || v === null || v === undefined) return '';
  return esc(v);
};

export const html = (strings, ...vals) => new Safe(strings.reduce((acc, s, i) => acc + s + (i < vals.length ? part(vals[i]) : ''), ''));
