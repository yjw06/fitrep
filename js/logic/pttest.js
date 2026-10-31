// 체력 검정: 격주 일정, 2분 모드 진행, 기록 병합, 목표 진행률 (순수 함수)
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

export const cumulativeTarget = (goal, elapsedSec, totalSec) => (goal > 0 ? Math.round((goal * Math.min(elapsedSec, totalSec)) / totalSec) : null);

export function cuePoints(totalSec, every) {
  const out = [];
  for (let t = every; t < totalSec; t += every) out.push(t);
  return out;
}

// drill: { type:'pttest', item, goal, startAt(카운트다운 시작 ms), countdown, sec }
export function ptPhase(drill, now) {
  const runAt = drill.startAt + drill.countdown * 1000;
  if (now < runAt) return { phase: 'countdown', countdownLeft: Math.ceil((runAt - now) / 1000), elapsed: 0, left: drill.sec };
  const elapsed = (now - runAt) / 1000;
  if (elapsed >= drill.sec) return { phase: 'done', countdownLeft: 0, elapsed: drill.sec, left: 0 };
  return { phase: 'run', countdownLeft: 0, elapsed, left: drill.sec - elapsed };
}

// 같은 날짜 검정 기록이 있으면 항목을 합치고, 없으면 새로 추가
export function upsertTest(tests, date, patch, makeId) {
  const i = tests.findIndex((t) => t.date === date);
  if (i < 0) return [...tests, { id: makeId(), date, pullups: null, pushups: null, situps: null, run3kSec: null, mode: patch.mode ?? 'manual', ...patch }];
  const next = [...tests];
  next[i] = { ...next[i], ...patch, mode: patch.mode === 'timed' || next[i].mode === 'timed' ? 'timed' : 'manual' };
  return next;
}

// 목표 대비 진행률 0~1. lowerIsBetter(3km)는 목표 이하면 1
export function goalProgress(value, goal, lowerIsBetter = false) {
  if (value == null || !(goal > 0)) return null;
  const p = lowerIsBetter ? goal / value : value / goal;
  return Math.max(0, Math.min(1, p));
}

export function testSeries(tests, key) {
  return [...tests].filter((t) => t[key] != null).sort((a, b) => (a.date < b.date ? -1 : 1)).map((t) => ({ date: t.date, value: t[key] }));
}
