// 화면 공용 계산
import * as P from '../../data/program.js';
import { state } from '../store.js';
import { todayStr, weekNumber, isDeloadWeek, diffDays, mondayOf as monOf } from '../logic/dates.js';
import { fmtKg } from '../logic/num.js';
import { rankInfo } from '../logic/rank.js';
import { latestTestValues } from '../logic/missions.js';
import { buildPlan } from '../logic/plan.js';
import { weekSchedule } from '../logic/reschedule.js';

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

// ── 2단계 공용 ──

export function pullupRank() {
  const max = latestTestValues(state.tests).pullups;
  return { ...rankInfo(max, P.PULLUP_RANKS), max };
}

export function planFor(key, wi) {
  const r = pullupRank();
  return buildPlan(P.SESSIONS[key], {
    week: wi.week, deloadEvery: state.settings.deloadEvery,
    negStage: state.exState.negPullup?.stage ?? 0, negStages: P.NEGATIVE_STAGES,
    alts: state.settings.alts, exercises: P.EXERCISES,
    pullup: { rank: r.rank, max: r.max },
  });
}

export const reschedOf = (date) => state.reschedule[monOf(date)] ?? null;
export const scheduleFor = (date) => weekSchedule(monOf(date), P.WEEK_PLAN, reschedOf(date));
export const passOf = (date) => reschedOf(date)?.passes?.find((p) => p.date === date) ?? null;

// 계급장: 가로 막대 1~4개
export function insignia(bars, size = 22) {
  const NS = 'http://www.w3.org/2000/svg';
  const h = size, w = size * 0.9, gap = h / 10, bh = (h - gap * 5) / 4;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);
  svg.setAttribute('class', 'insignia');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `계급장 막대 ${bars}개`);
  for (let i = 0; i < 4; i++) {
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('x', 0);
    r.setAttribute('y', h - gap - (i + 1) * bh - i * gap);
    r.setAttribute('width', w);
    r.setAttribute('height', bh);
    r.setAttribute('class', i < bars ? 'on' : 'off');
    svg.append(r);
  }
  return svg;
}
