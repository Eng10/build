import { addDays, monthKey, daysBetween } from './dates.js';

export const PERIODS = { all: null, '1m': 30, '2m': 60, '6m': 182, '1y': 365 };
export const PERIOD_KEYS = Object.keys(PERIODS);

export const sumAmount = (rows) => rows.reduce((s, x) => s + Number(x.amount), 0);
export const paidOnly = (payments) => payments.filter((p) => p.status === 'paid');
export const scheduledOnly = (payments) => payments.filter((p) => p.status === 'scheduled');

export function filterPeriod(payments, period, today) {
  const days = PERIODS[period];
  const from = days == null ? '0000-00-00' : addDays(today, -days);
  return paidOnly(payments).filter((p) => p.paid_on >= from);
}

export function groupSum(rows, keyFn) {
  const map = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    map.set(k, (map.get(k) || 0) + Number(r.amount));
  }
  return [...map.entries()];
}

export function summary(rows, budget) {
  const total = sumAmount(rows);
  const count = rows.length;
  return {
    total,
    count,
    avg: count ? total / count : 0,
    max: rows.reduce((m, r) => Math.max(m, Number(r.amount)), 0),
    share: budget > 0 ? (total / budget) * 100 : null,
  };
}

export const monthly = (rows) => groupSum(rows, (r) => monthKey(r.paid_on)).sort((a, b) => a[0].localeCompare(b[0]));
export const spentOnStage = (payments, stageId) => sumAmount(paidOnly(payments).filter((p) => p.stage_id === stageId));
export const spentOnItem = (payments, itemId) => sumAmount(paidOnly(payments).filter((p) => p.item_id === itemId));
export const paidToContractor = (payments, cid) => sumAmount(paidOnly(payments).filter((p) => p.contractor_id === cid));
export const upcoming = (payments) => scheduledOnly(payments).sort((a, b) => a.paid_on.localeCompare(b.paid_on));

export function timeline(project, today) {
  if (!project?.start_date || !project?.end_date) return null;
  const total = Math.max(1, daysBetween(project.start_date, project.end_date));
  return { elapsed: Math.max(0, Math.min(100, (daysBetween(project.start_date, today) / total) * 100)), left: daysBetween(today, project.end_date) };
}
