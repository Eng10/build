const AR = '٠١٢٣٤٥٦٧٨٩';
const FA = '۰۱۲۳۴۵۶۷۸۹';

export const toLatinDigits = (s) =>
  String(s ?? '').replace(/[٠-٩]/g, (d) => AR.indexOf(d)).replace(/[۰-۹]/g, (d) => FA.indexOf(d));

// يقبل أرقاماً عربية وفواصل (٬ , ٫) ويرجع null إذا لم يكن رقماً صحيحاً
export function parseNum(s) {
  const x = toLatinDigits(s).replace(/[,٬\s]/g, '').replace('٫', '.');
  if (x === '') return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

// يوحّد الجوال إلى الصيغة المحلية: +966512345678 → 0512345678
export function normalizePhone(s) {
  let x = toLatinDigits(s).replace(/[\s\-().]/g, '');
  if (x.startsWith('00')) x = '+' + x.slice(2);
  return x.replace(/^\+?966/, '0');
}

export const normalizeUsername = (s) => String(s ?? '').trim().replace(/^@/, '').toLowerCase();
export const isValidUsername = (u) => /^[a-z0-9_]{3,30}$/.test(u);
export const isValidPhone = (p) => /^[0-9+]{8,16}$/.test(p);

// معرّف الدعوة: جوال إن كان أرقاماً، وإلا اسم مستخدم
export function identifierOf(s) {
  const phone = normalizePhone(String(s ?? '').trim());
  return /^\+?[0-9]{8,15}$/.test(phone) ? phone : normalizeUsername(s);
}

export const money = (n, { hidden = false } = {}) =>
  hidden || n === null || n === undefined || Number.isNaN(Number(n)) ? '•••' : Math.round(Number(n)).toLocaleString('en-US');

export const percent = (n) => (n === null || n === undefined ? null : Math.max(0, Math.min(100, Math.round(n))));
