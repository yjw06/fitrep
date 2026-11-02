// 체력 검정(격주 일요일 턱걸이 측정): 일정·최근 값·기록 병합 (순수 함수)
import { addDays, diffDays } from './dates.js';

// 기준일 미설정 시: 시작 주의 일요일
export const testAnchor = (settings) => settings.testAnchorDate ?? (settings.startDate ? addDays(settings.startDate, 6) : null);

export function isTestDay(date, anchor) {
  if (!anchor) return false;
  const d = diffDays(anchor, date);
  return d >= 0 && d % 14 === 0;
}

export function nextTestDate(date, anchor) {
  if (!anchor) return null;
  const d = diffDays(anchor, date);
  if (d <= 0) return anchor;
  return addDays(anchor, Math.ceil(d / 14) * 14);
}

// 항목별 최신 값(날짜 내림차순으로 첫 non-null)
export function latestTestValues(tests) {
  const sorted = [...tests].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const pick = (k) => sorted.find((t) => t[k] != null && t[k] !== '')?.[k] ?? null;
  return { pullups: pick('pullups'), pushups: pick('pushups'), situps: pick('situps') };
}

// 같은 날짜 기록이 있으면 항목을 합치고, 없으면 새로 추가
export function upsertTest(tests, date, patch, makeId) {
  const i = tests.findIndex((t) => t.date === date);
  if (i < 0) return [...tests, { id: makeId(), date, pullups: null, pushups: null, situps: null, ...patch }];
  const next = [...tests];
  next[i] = { ...next[i], ...patch };
  return next;
}

export function testSeries(tests, key) {
  return [...tests].filter((t) => t[key] != null).sort((a, b) => (a.date < b.date ? -1 : 1)).map((t) => ({ date: t.date, value: t[key] }));
}
