// 체중·단백질 (순수 함수)
import { addDays } from './dates.js';

export function avgOver(entries, endDate, days) {
  const start = addDays(endDate, 1 - days);
  const xs = entries.filter((e) => e.date >= start && e.date <= endDate).map((e) => e.kg);
  if (!xs.length) return { avg: null, n: 0 };
  return { avg: Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100, n: xs.length };
}

// 7일 평균 vs 2주 전 7일 평균. 증가 < minGain이면 +kcal 제안
export function weightTrend(entries, date, cfg) {
  const now = avgOver(entries, date, cfg.avgDays);
  const prev = avgOver(entries, addDays(date, -cfg.compareDays), cfg.avgDays);
  const enough = now.n >= cfg.minEntries && prev.n >= cfg.minEntries;
  const diff = enough ? Math.round((now.avg - prev.avg) * 100) / 100 : null;
  return { avg: now.avg, n: now.n, prevAvg: prev.avg, prevN: prev.n, diff, enough, suggest: enough && diff < cfg.minGain };
}

export function upsertWeight(entries, date, kg) {
  return [...entries.filter((e) => e.date !== date), { date, kg }].sort((a, b) => (a.date < b.date ? -1 : 1));
}

export const proteinTotal = (list = []) => Math.round(list.reduce((a, x) => a + (+x.g || 0), 0) * 10) / 10;

export function proteinStatus(total, [lo, hi]) {
  if (total < lo) return 'low';
  if (total > hi) return 'high';
  return 'ok';
}

// 7일 평균 이동 곡선(그래프용)
export function rollingAverage(entries, days) {
  return entries.map((e) => ({ date: e.date, avg: avgOver(entries, e.date, days).avg }));
}
