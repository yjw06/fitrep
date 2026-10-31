import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avgOver, weightTrend, upsertWeight, proteinTotal, proteinStatus } from '../js/logic/body.js';
import { BODY } from '../data/program.js';
import { addDays } from '../js/logic/dates.js';

const series = (start, kgs) => kgs.map((kg, i) => ({ date: addDays(start, i), kg }));

test('7일 평균', () => {
  const e = series('2026-11-01', [70, 70.2, 70.4, 70.6, 70.8, 71, 71.2, 99]);
  assert.deepEqual(avgOver(e, '2026-11-07', 7), { avg: 70.6, n: 7 });
  assert.deepEqual(avgOver([], '2026-11-07', 7), { avg: null, n: 0 });
});

test('2주 전보다 +0.2kg 미만이면 +300kcal 제안', () => {
  const flat = series('2026-11-01', Array(21).fill(70));
  const t = weightTrend(flat, '2026-11-21', BODY);
  assert.equal(t.enough, true);
  assert.equal(t.diff, 0);
  assert.equal(t.suggest, true);
  const up = series('2026-11-01', Array.from({ length: 21 }, (_, i) => 70 + i * 0.05));
  const u = weightTrend(up, '2026-11-21', BODY);
  assert.equal(u.diff, 0.7);
  assert.equal(u.suggest, false);
  // 기록 부족 → 판단 보류
  assert.equal(weightTrend(series('2026-11-15', [70, 70, 70, 70, 70, 70, 70]), '2026-11-21', BODY).suggest, false);
});

test('체중 같은 날 덮어쓰기, 단백질 합계·상태', () => {
  const e = upsertWeight([{ date: '2026-11-02', kg: 70 }], '2026-11-02', 70.4);
  assert.deepEqual(e, [{ date: '2026-11-02', kg: 70.4 }]);
  assert.equal(proteinTotal([{ g: 45 }, { g: 31.5 }, { g: 31.5 }]), 108);
  assert.equal(proteinStatus(108, [120, 150]), 'low');
  assert.equal(proteinStatus(130, [120, 150]), 'ok');
  assert.equal(proteinStatus(160, [120, 150]), 'high');
});
