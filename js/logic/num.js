// 부동소수 오차 없이 step 단위 반올림
export function roundTo(x, step) {
  if (!step) return x;
  return +(Math.round(x / step) * step).toFixed(3);
}
export const fmtKg = (w) => (w == null ? '—' : String(+(+w).toFixed(2)));
