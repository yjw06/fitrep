// 메인 리프트 워밍업: 빈봉 10 → 50%×5 → 70%×3 → 85%×1 (원판 단위 반올림, 빈봉 이하 단계 생략)
import { roundTo } from './num.js';

export function roundLoadable(weight, bar, plates) {
  const min = Math.min(...plates);
  const step = min * 2;
  if (weight <= bar) return bar;
  return roundTo(bar + Math.round((weight - bar) / step) * step, 0.01);
}

// 한쪽 원판 구성(큰 것부터 그리디). 남는 무게는 무시(이미 반올림됐다고 가정)
export function platesPerSide(total, bar, plates) {
  let side = roundTo((total - bar) / 2, 0.001);
  const out = [];
  for (const p of [...plates].sort((a, b) => b - a)) {
    while (side >= p - 1e-9) { out.push(p); side = roundTo(side - p, 0.001); }
  }
  return out;
}

export function warmupSets(work, { bar, plates }, steps) {
  if (!(work > bar)) return [];
  const out = [];
  let last = -1;
  for (const st of steps) {
    const w = st.pct === 0 ? bar : roundLoadable(work * st.pct, bar, plates);
    if (st.pct !== 0 && (w <= bar || w >= work)) continue;
    if (w === last) continue;
    last = w;
    out.push({ label: st.label ?? `${Math.round(st.pct * 100)}%`, weight: w, reps: st.reps, plates: platesPerSide(w, bar, plates) });
  }
  return out;
}
