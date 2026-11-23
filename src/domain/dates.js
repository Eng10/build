export const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
export const addDays = (iso, n) => new Date(Date.parse(iso) + n * 864e5).toISOString().slice(0, 10);
export const monthKey = (iso) => iso.slice(0, 7);
export const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s ?? '');
