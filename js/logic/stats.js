// 기록 집계 (순수 함수)
import { topSet, totalReps } from './progression.js';
import { mondayOf, addDays } from './dates.js';

const byDate = (a, b) => (a.date === b.date ? (a.startedAt ?? 0) - (b.startedAt ?? 0) : a.date < b.date ? -1 : 1);

// 종목별 기록(오래된→최신)
export function exerciseHistory(sessions, exId, kind) {
  const out = [];
  for (const s of [...sessions].sort(byDate)) {
    for (const e of s.entries) {
      if (e.ex !== exId || !e.sets.length) continue;
      const top = topSet(e.sets, kind);
      out.push({ date: s.date, sessionId: s.id, week: s.week, deload: !!s.deload, top, totalReps: totalReps(e.sets), sets: e.sets });
    }
  }
  return out;
}

export const lastPerformance = (sessions, exId, kind) => exerciseHistory(sessions, exId, kind).at(-1) ?? null;

// 정체 판정용 이력(정비 주간 제외)
export const judgeHistory = (sessions, exId, kind) =>
  exerciseHistory(sessions, exId, kind).filter((h) => !h.deload).map((h) => ({ weight: h.top.w ?? 0, totalReps: h.totalReps }));

// 이번 주(월~일) 완료한 세션 키
export function weekDone(sessions, dateStr) {
  const mon = mondayOf(dateStr), sun = addDays(mon, 6);
  return new Set(sessions.filter((s) => s.date >= mon && s.date <= sun).map((s) => s.key));
}

// 기록이 있는 종목 id 목록(최근 순)
export function loggedExercises(sessions) {
  const seen = new Map();
  for (const s of [...sessions].sort(byDate)) for (const e of s.entries) if (e.sets.length) seen.set(e.ex, s.date);
  return [...seen.entries()].sort((a, b) => (a[1] < b[1] ? 1 : -1)).map(([id]) => id);
}
