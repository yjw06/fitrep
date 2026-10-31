// 화면 공용 계산
import * as P from '../../data/program.js';
import { state } from '../store.js';
import { todayStr, weekNumber, isDeloadWeek, diffDays } from '../logic/dates.js';
import { fmtKg } from '../logic/num.js';

export { P };
export const exOf = (id) => P.EXERCISES[id];
export const exName = (id) => P.EXERCISES[id]?.name ?? id;
export const today = () => todayStr();

export function weekInfo(date = today()) {
  const start = state.settings.startDate;
  if (!start) return { week: 1, deload: false, before: 0 };
  const raw = weekNumber(start, date);
  const before = Math.max(0, diffDays(date, start));
  const week = Math.max(1, raw);
  return { week, deload: raw >= 1 && isDeloadWeek(week, state.settings.deloadEvery), before };
}

export const repsText = (p) => (p.reps[0] === p.reps[1] ? `${p.reps[0]}` : `${p.reps[0]}~${p.reps[1]}`);

export function prescText(p) {
  let s = `${p.sets}×${repsText(p)}`;
  if (p.perSide) s += '(좌우/다리당)';
  if (p.tempo) s += ` · ${p.tempo}초 하강`;
  if (p.rir) s += ` · RIR ${p.rir[0] === p.rir[1] ? p.rir[0] : `${p.rir[0]}~${p.rir[1]}`}`;
  return s;
}

export const usesWeight = (ex) => !['plyo', 'negative', 'bodyweight'].includes(ex.kind);

export function setText(s, ex) {
  if (!s) return '—';
  const r = `${s.reps ?? '—'}`;
  const rir = s.rir != null ? ` R${s.rir}` : '';
  if (!usesWeight(ex)) return `${r}회${rir}`;
  return `${fmtKg(s.w)}×${r}${rir}`;
}
