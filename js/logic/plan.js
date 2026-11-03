// 세션 계획: 처방 계산, 세트 순서(슈퍼세트 A→B 후 휴식), 60분 가드 (순수 함수)
import { isDeloadWeek } from './dates.js';
import { roadmapItem } from './roadmap.js';

export const restMid = ([a, b]) => Math.round((a + b) / 2 / 5) * 5;

// 한 종목 처방. 1주차는 전 종목 RIR 3으로 시작 무게 탐색, 정비 주간은 세트 절반(올림).
// rirLastOnly: 고립 종목처럼 목표 RIR을 마지막 세트에만 적용(1주차 제외)
export function prescribe(item, ex, { week, deloadEvery, negStage = 0, negStages }) {
  const deload = isDeloadWeek(week, deloadEvery);
  let sets = item.sets, reps = item.reps, tempo = null;
  if (ex.kind === 'negative' && negStages) {
    const st = negStages[Math.min(negStage, negStages.length - 1)];
    sets = st.sets; reps = [st.reps, st.reps]; tempo = st.tempo;
  }
  const firstWeek = ['main', 'accessory', 'isolation', 'assist'].includes(ex.kind) && week <= 1;
  const rir = firstWeek ? [3, 3] : (item.rir ?? null);
  if (deload) sets = Math.ceil(sets / 2);
  return { sets, reps: [...reps], rir, rirLastOnly: !firstWeek && !!rir && !!item.rirLastOnly, tempo, perSide: !!item.perSide, note: item.note ?? '' };
}

/**
 * 세션 정의 → 실행 계획
 * ctx: { week, deloadEvery, negStage, negStages, alts:{'slotId.itemIdx':exId}, exercises, pullup?:{ stage, max } }
 * pullup이 있으면 턱걸이 슬롯(pullupSlot = 요일 id)을 로드맵 단계 처방으로 교체(같은 종목이면 루틴 처방 그대로)
 */
export function buildPlan(def, ctx) {
  const slots = [], entries = [];
  for (const slot of def.slots) {
    let items = slot.items, rest = slot.rest;
    if (slot.pullupSlot && ctx.pullup) {
      const it = roadmapItem(ctx.pullup.stage, slot.pullupSlot, ctx.pullup.max);
      items = [it.ex === slot.items[0].ex ? slot.items[0] : it];
      if (it.rest) rest = [it.rest, it.rest];
    }
    // fixed: 시간 초과 감축에서 빼는 슬롯(턱걸이 슬롯·메인 리프트)
    const fixed = !!slot.pullupSlot || items.some((it) => ctx.exercises[it.ex]?.kind === 'main');
    slots.push({ id: slot.id, rest: restMid(rest), superset: items.length > 1, fixed });
    items.forEach((item, i) => {
      // 대체 종목: 문자열이면 같은 처방, 객체면 그 처방(sets·reps·note)으로
      const specs = [item, ...(item.alts ?? []).map((a) => (typeof a === 'string' ? { ...item, ex: a } : a))];
      const options = specs.map((sp) => sp.ex);
      const chosen = ctx.alts?.[`${slot.id}.${i}`];
      const exId = options.includes(chosen) ? chosen : item.ex;
      const prescs = Object.fromEntries(specs.map((sp) => [sp.ex, prescribe(sp, ctx.exercises[sp.ex], ctx)]));
      entries.push({ slotId: slot.id, itemIdx: i, ex: exId, options, prescs, presc: prescs[exId], sets: [] });
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

// [마지막 슈퍼세트 1세트 감축] 대상 슬롯: 줄일 세트가 남은 마지막 슈퍼세트.
// 슈퍼세트가 없는 날(등)은 메인·턱걸이 슬롯을 뺀 마지막 종목. 이미 한 세트 아래로는 안 줄인다.
export function trimTarget(plan, trim = {}) {
  const canTrim = (slot) => plan.entries.some((e) => e.slotId === slot.id && e.presc.sets - (trim[slot.id] || 0) > Math.max(e.sets.length, 1));
  const rev = [...plan.slots].reverse();
  return (rev.find((s) => s.superset && canTrim(s)) ?? rev.find((s) => !s.superset && !s.fixed && canTrim(s)))?.id ?? null;
}
