// 턱걸이 로드맵: 정자세 최대 → 단계(1~4), 단계별 1번 슬롯 처방 (순수 함수)

export function stageIndex(max, stages) {
  let idx = 0;
  stages.forEach((st, k) => { if ((max ?? 0) >= st.min) idx = k; });
  return idx;
}

export function stageInfo(max, stages) {
  const idx = stageIndex(max, stages);
  const next = stages[idx + 1] ?? null;
  return { idx, stage: stages[idx], next, toNext: next ? Math.max(0, next.min - (max ?? 0)) : 0 };
}

// 1번 슬롯 처방(slot item 형태). key: 요일 id('tue'·'fri'). repsFromMax: 최대 − n개(최소 1)
export function roadmapItem(stage, key, max) {
  const u = stage[key];
  const item = { ex: u.ex, sets: u.sets, note: u.note };
  if (u.repsFromMax != null) {
    const r = Math.max(1, (max ?? 0) - u.repsFromMax);
    item.reps = [r, r];
  } else item.reps = [...u.reps];
  if (u.rir) item.rir = [...u.rir];
  if (u.rest) item.rest = u.rest;
  return item;
}
