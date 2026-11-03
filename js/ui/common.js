// 화면 공용 계산
import * as P from '../../data/program.js';
import { state } from '../store.js';
import { todayStr, weekNumber, isDeloadWeek, diffDays } from '../logic/dates.js';
import { fmtKg } from '../logic/num.js';
import { stageInfo } from '../logic/roadmap.js';
import { latestTestValues } from '../logic/pttest.js';
import { buildPlan } from '../logic/plan.js';

export { P };
export const exOf = (id) => P.EXERCISES[id];
export const exName = (id) => P.EXERCISES[id]?.name ?? id;
export const today = () => todayStr();

// 세션 정의. 이전 루틴 기록(UA 등)은 이름만 있는 정의로
export const sessionDef = (key) => P.SESSIONS[key] ?? { key, name: P.RETIRED_SESSIONS[key] ?? key, short: key, code: key, slots: [], notes: [] };

// 슬롯 번호: 'mon3' → '3'
export const slotNo = (slotId) => slotId.replace(/^\D+/, '');

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
  if (p.perSide) s += '(좌우)';
  if (p.tempo) s += ` · ${p.tempo}초 하강`;
  if (p.rir) s += ` · RIR ${p.rir[0] === p.rir[1] ? p.rir[0] : `${p.rir[0]}~${p.rir[1]}`}${p.rirLastOnly ? '(마지막 세트)' : ''}`;
  return s;
}

export const usesWeight = (ex) => !['negative', 'bodyweight'].includes(ex.kind);
export const weightLabel = (ex) => (ex.kind === 'assist' ? '보조 무게' : ex.perHand ? '무게(한 손)' : '무게');

export function setText(s, ex) {
  if (!s) return '—';
  const r = `${s.reps ?? '—'}`;
  const rir = s.rir != null ? ` R${s.rir}` : '';
  if (!usesWeight(ex)) return `${r}회${rir}`;
  return `${fmtKg(s.w)}×${r}${rir}`;
}

export function pullupStage() {
  const max = latestTestValues(state.tests).pullups;
  return { ...stageInfo(max, P.PULLUP_STAGES), max };
}

export function planFor(key, wi) {
  const r = pullupStage();
  return buildPlan(P.SESSIONS[key], {
    week: wi.week, deloadEvery: state.settings.deloadEvery,
    negStage: state.exState.negative_pullup?.stage ?? 0, negStages: P.NEGATIVE_STAGES,
    alts: state.settings.alts, exercises: P.EXERCISES,
    pullup: { stage: r.stage, max: r.max },
  });
}
