// 세션 계획: 처방 계산, 세트 순서(슈퍼세트 A→B 후 휴식), 60분 가드 (순수 함수)
import { isDeloadWeek } from './dates.js';

export const restMid = ([a, b]) => Math.round((a + b) / 2 / 5) * 5;

// 한 종목 처방. week 1은 RIR 3 탐색, 정비 주간은 세트 절반(올림)
export function prescribe(item, ex, { week, deloadEvery, negStage = 0, negStages }) {
  const deload = isDeloadWeek(week, deloadEvery);
  let sets = item.sets, reps = item.reps, tempo = null;
  if (ex.kind === 'negative' && negStages) {
    const st = negStages[Math.min(negStage, negStages.length - 1)];
    sets = st.sets; reps = [st.reps, st.reps]; tempo = st.tempo;
  }
  const weighted = ['main', 'accessory', 'assist'].includes(ex.kind);
  const rir = weighted && week <= 1 ? [3, 3] : (item.rir ?? null);
  if (deload) sets = Math.ceil(sets / 2);
  return { sets, reps: [...reps], rir, tempo, perSide: !!item.perSide, note: item.note ?? '' };
}

/**
 * 세션 정의 → 실행 계획
 * ctx: { week, deloadEvery, negStage, negStages, alts:{slotId:exId}, exercises }
 */
export function buildPlan(def, ctx) {
  const slots = [], entries = [];
  for (const slot of def.slots) {
    slots.push({ id: slot.id, rest: restMid(slot.rest), superset: slot.items.length > 1 });
    slot.items.forEach((item, i) => {
      const options = [item.ex, ...(item.alts ?? [])];
      const chosen = ctx.alts?.[`${slot.id}.${i}`];
      const exId = options.includes(chosen) ? chosen : item.ex;
      entries.push({
        slotId: slot.id, itemIdx: i, ex: exId, options,
        presc: prescribe(item, ctx.exercises[exId], ctx),
        sets: [],
      });
    });
  }
  return { slots, entries, deload: isDeloadWeek(ctx.week, ctx.deloadEvery) };
}

export const effSets = (entry, trim = 0) => Math.max(entry.sets.length, entry.presc.sets - trim, 0);

// 세트 순서. 슈퍼세트는 라운드별로 A→B, 라운드 마지막에만 휴식.
export function buildSteps(plan, trim = {}) {
  const steps = [];
  for (const slot of plan.slots) {
    const idxs = plan.entries.map((e, i) => (e.slotId === slot.id ? i : -1)).filter((i) => i >= 0);
    const counts = idxs.map((i) => effSets(plan.entries[i], trim[slot.id] || 0));
    const rounds = Math.max(0, ...counts);
    for (let r = 0; r < rounds; r++) {
      const inRound = idxs.filter((_, k) => counts[k] > r);
      inRound.forEach((e, k) => {
        steps.push({ entry: e, set: r, slotId: slot.id, restAfter: k === inRound.length - 1 ? slot.rest : 0 });
      });
    }
  }
  return steps;
}

export const isStepDone = (plan, st) => plan.entries[st.entry].sets.length > st.set;
export const nextStepIndex = (plan, steps) => steps.findIndex((st) => !isStepDone(plan, st));

// 남은 시간(초) = 진행 중 휴식 + Σ(남은 세트 × (세트 시간 + 휴식)). 마지막 세트 뒤 휴식은 제외.
export function remainingSec(plan, steps, { restLeft = 0, setSec = 40 } = {}) {
  const left = steps.filter((st) => !isStepDone(plan, st));
  let sum = Math.max(0, restLeft);
  left.forEach((st, i) => { sum += setSec + (i === left.length - 1 ? 0 : st.restAfter); });
  return sum;
}

export function guard({ now, startedAt, remaining, limitMin = 60 }) {
  const elapsedSec = Math.max(0, (now - startedAt) / 1000);
  const etaMs = now + remaining * 1000;
  const limitMs = startedAt + limitMin * 60000;
  return { elapsedSec, etaMs, limitMs, over: etaMs > limitMs, overSec: Math.max(0, (etaMs - limitMs) / 1000) };
}

// [마지막 슈퍼세트 1세트 감축] 대상 슬롯: 줄일 세트가 남은 마지막 슈퍼세트
export function trimTarget(plan, trim = {}) {
  for (let i = plan.slots.length - 1; i >= 0; i--) {
    const slot = plan.slots[i];
    if (!slot.superset) continue;
    const t = trim[slot.id] || 0;
    const canTrim = plan.entries.some((e) => e.slotId === slot.id && e.presc.sets - t > Math.max(e.sets.length, 1));
    if (canTrim) return slot.id;
  }
  return null;
}
