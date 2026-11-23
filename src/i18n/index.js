import ar from './ar.js';
import en from './en.js';

const dicts = { ar, en };
let current = 'ar';

export const setLang = (l) => {
  current = dicts[l] ? l : 'ar';
};
export const getLang = () => current;
export const dirOf = (l = current) => (l === 'ar' ? 'rtl' : 'ltr');
export const dictionaries = dicts;

export function t(key, vars) {
  let s = dicts[current][key] ?? dicts.ar[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, n) => vars[n] ?? '');
  return s;
}

export const defaultStageNames = () => Array.from({ length: 10 }, (_, i) => t('stage_' + (i + 1)));
