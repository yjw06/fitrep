// 턱걸이 계급: 정자세 최대 → 계급, 상체A 1번 처방 (순수 함수)

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
