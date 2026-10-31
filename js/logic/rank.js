// 턱걸이 계급: 정자세 최대 → 계급, 상체A 1번 처방, 스킬 데이 계획 (순수 함수)

export function rankIndex(max, ranks) {
  let idx = 0;
  ranks.forEach((r, k) => { if ((max ?? 0) >= r.min) idx = k; });
  return idx;
}

export function rankInfo(max, ranks) {
  const idx = rankIndex(max, ranks);
  const next = ranks[idx + 1] ?? null;
  return { idx, rank: ranks[idx], next, toNext: next ? Math.max(0, next.min - (max ?? 0)) : 0 };
}

// 상체A 1번 슬롯 처방(slot item 형태). repsFromMax: 최대 − n개(최소 1)
export function ua1Item(rank, max) {
  const u = rank.ua1;
  const item = { ex: u.ex, sets: u.sets, note: u.note };
  if (u.repsFromMax != null) {
    const r = Math.max(1, (max ?? 0) - u.repsFromMax);
    item.reps = [r, r];
  } else item.reps = [...u.reps];
  if (u.rest) item.rest = u.rest;
  return item;
}

export const skillPlan = (rankIdx, program) => program.SKILL_PLANS[program.PULLUP_RANKS[rankIdx].skill];

// 스킬 가이드용 세트 목록으로 펼침
export function skillSets(plan) {
  const out = [];
  for (const st of plan) {
    if (st.ladder) {
      for (let r = 0; r < st.rounds; r++) {
        for (const n of st.ladder) out.push({ step: st.id, name: st.name, label: `${r + 1}회차 · ${n}개`, reps: n });
      }
    } else {
      for (let k = 0; k < st.sets; k++) {
        out.push({ step: st.id, name: st.name, label: st.hold ? `${k + 1}세트 · 최대 버티기` : `${k + 1}세트 · ${st.reps}개`, reps: st.reps ?? null, hold: !!st.hold, goalSec: st.goalSec ?? null });
      }
    }
  }
  return out;
}

export function skillDose(st) {
  if (st.ladder) return `${st.ladder.join('-')} × ${st.rounds}회`;
  if (st.hold) return `${st.sets}×최대${st.goalSec ? `(목표 ${st.goalSec}초)` : ''}`;
  return `${st.sets}×${st.reps}`;
}
