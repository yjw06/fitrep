// 판정 규칙 (순수 함수)
import { roundTo } from './num.js';

// 종목별 증가폭: 개별 설정 > 메인(상체/하체) > 장비별 기본
export function incrementFor(exId, ex, settings) {
  const o = settings.incOverride?.[exId];
  if (o > 0) return o;
  const inc = settings.inc;
  if (ex.kind === 'main') return ex.region === 'lower' ? inc.mainLower : inc.mainUpper;
  return inc[ex.equip] ?? 2.5;
}

export const totalReps = (sets) => sets.reduce((a, s) => a + (s.reps || 0), 0);

// 톱세트: 가장 무거운 세트(같으면 반복 많은 쪽). 어시스트는 보조 무게가 가장 낮은 세트.
export function topSet(sets, kind) {
  let best = null;
  for (const s of sets) {
    if (!best) { best = s; continue; }
    const better = kind === 'assist'
      ? s.w < best.w || (s.w === best.w && s.reps > best.reps)
      : s.w > best.w || (s.w === best.w && s.reps > best.reps);
    if (better) best = s;
  }
  return best;
}

// 정체: 같은 무게에서 2주 연속 총 반복 수 제자리(증가 없음). history는 오래된→최신, 이번 세션 포함.
export function isStalled(history) {
  if (history.length < 3) return false;
  const [a, b, c] = history.slice(-3);
  if (!(a.weight === b.weight && b.weight === c.weight)) return false;
  return b.totalReps <= a.totalReps && c.totalReps <= b.totalReps;
}

/**
 * 한 종목 판정.
 * @param {object} p
 * @param {string} p.exId
 * @param {object} p.ex       EXERCISES 항목
 * @param {object} p.presc    { sets, reps:[lo,hi], rir:[lo,hi]|null }
 * @param {Array}  p.sets     [{ w, reps, rir }]
 * @param {object} p.settings
 * @param {Array}  p.history  이전 비정비 세션 [{ weight, totalReps }] 오래된→최신
 * @param {boolean} p.deload
 * @returns {{ exId, action, weight, prev, reason }}
 *   action: increase | decrease | hold | stall | none | check | note | skip
 */
export function judgeExercise({ exId, ex, presc, sets, settings, history = [], deload = false }) {
  const base = { exId, action: 'hold', weight: null, prev: null, reason: '' };
  if (!sets?.length) return { ...base, action: 'skip', reason: '기록 없음 — 목표 유지' };
  if (ex.kind === 'plyo') return { ...base, action: 'none', reason: '증량 판정 없음' };
  if (ex.kind === 'negative') return { ...base, action: 'check', reason: '수월했으면 체크 → 다음 단계' };

  const top = topSet(sets, ex.kind);
  const prev = top.w ?? 0;
  const res = { ...base, prev, weight: prev };
  const [, hi] = presc.reps;
  const complete = sets.length >= presc.sets;
  const allTop = complete && sets.every((s) => (s.reps || 0) >= hi);

  if (deload) return { ...res, reason: '정비 주간 — 판정 보류, 무게 유지' };

  if (ex.kind === 'bodyweight') {
    return allTop
      ? { ...res, action: 'note', reason: '전 세트 윗끝 — 하강을 느리게 해 난이도 ↑' }
      : { ...res, reason: '윗끝 미달 — 같은 목표 유지' };
  }

  const inc = incrementFor(exId, ex, settings);

  if (ex.kind === 'assist') {
    if (allTop) {
      if (prev <= 0) return { ...res, action: 'note', reason: `보조 없이 ${presc.sets}×${hi} 달성` };
      const next = Math.max(0, roundTo(prev - inc, 0.5));
      return { ...res, action: 'increase', weight: next, reason: `${presc.sets}×${hi} 달성 → 보조 −${inc}kg` };
    }
    return { ...res, reason: `${presc.sets}×${hi} 미달 — 보조 무게 유지` };
  }

  // main / accessory
  let pass = allTop;
  let why = complete ? '' : '세트 미완료';
  if (pass && ex.kind === 'main' && presc.rir) {
    const need = presc.rir[0];
    const rirOk = sets.every((s) => s.rir == null || s.rir >= need);
    if (!rirOk) { pass = false; why = `RIR ${need} 미유지`; }
  }
  if (!why && !pass) why = '윗끝 미달';

  if (pass && prev > 0) {
    return { ...res, action: 'increase', weight: roundTo(prev + inc, 0.25), reason: `전 세트 ${hi}회${ex.kind === 'main' ? ' + RIR 유지' : ''} → +${inc}kg` };
  }
  if (pass) return { ...res, reason: '무게 미기록 — 목표 유지' };

  const hist = [...history, { weight: prev, totalReps: totalReps(sets) }];
  if (prev > 0 && isStalled(hist)) {
    const next = Math.max(0, roundTo(prev * 0.9, inc));
    return { ...res, action: 'stall', weight: next, reason: `2주 연속 총 반복 제자리 → 10% 낮춘 ${next}kg 제안` };
  }
  return { ...res, reason: `${why} — 같은 무게 유지` };
}

export function nextNegStage(stage, easy, max) {
  return easy ? Math.min(stage + 1, max) : stage;
}
