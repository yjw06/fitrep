import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startInterval, lapInterval, advanceInterval, intervalView, lapSummary } from '../js/logic/interval.js';

test('달리기 → 랩 → 90초 걷기 → 다음 달리기 … 6회 후 종료', () => {
  let d = startInterval({ pace: 100, reps: 6, walkSec: 90 }, 0);
  assert.equal(intervalView(d, 49_000).halfwayDue, false);
  assert.equal(intervalView(d, 50_000).halfwayDue, true); // 200m 예상 시점
  d = { ...d, cued: true };
  assert.equal(intervalView(d, 60_000).halfwayDue, false);
  d = lapInterval(d, 98_000);
  assert.deepEqual([d.phase, d.laps], ['walk', [98]]);
  assert.equal(intervalView(d, 128_000).walkLeft, 60);
  assert.equal(advanceInterval(d, 150_000), d); // 아직 걷기
  // 앱이 늦게 깨어나도 걷기 종료 시각부터 달리기 시간 계산
  d = advanceInterval(d, 200_000);
  assert.deepEqual([d.phase, d.rep, d.phaseStart, d.cued], ['run', 1, 188_000, false]);
  for (let i = 1; i < 6; i++) {
    d = lapInterval(d, d.phaseStart + 101_000);
    d = advanceInterval(d, d.phaseStart + 90_000);
  }
  assert.equal(d.phase, 'done');
  assert.equal(d.laps.length, 6);
  assert.equal(lapInterval(d, 1e9), d);
});

test('랩 요약', () => {
  const s = lapSummary([98, 101, 100], 100);
  assert.deepEqual(s, { avg: 99.7, best: 98, worst: 101, diffs: [-2, 1, 0] });
  assert.equal(lapSummary([], 100), null);
});
