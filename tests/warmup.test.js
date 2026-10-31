import { test } from 'node:test';
import assert from 'node:assert/strict';
import { warmupSets, platesPerSide, roundLoadable } from '../js/logic/warmup.js';
import { WARMUP_STEPS } from '../data/program.js';

const eq = { bar: 20, plates: [20, 15, 10, 5, 2.5, 1.25] };

test('원판 단위 반올림(최소 원판 ×2 단위)', () => {
  assert.equal(roundLoadable(31, 20, eq.plates), 30); // 11/2.5=4.4 → 4 → 30
  assert.equal(roundLoadable(31.3, 20, eq.plates), 32.5);
  assert.equal(roundLoadable(15, 20, eq.plates), 20);
});

test('한쪽 원판 구성', () => {
  assert.deepEqual(platesPerSide(60, 20, eq.plates), [20]);
  assert.deepEqual(platesPerSide(85, 20, eq.plates), [20, 10, 2.5]);
  assert.deepEqual(platesPerSide(42.5, 20, eq.plates), [10, 1.25]);
  assert.deepEqual(platesPerSide(20, 20, eq.plates), []);
});

test('벤치 60kg 워밍업: 빈봉 10 → 30×5 → 42.5×3 → 50×1', () => {
  const w = warmupSets(60, eq, WARMUP_STEPS);
  assert.deepEqual(w.map((s) => [s.weight, s.reps]), [[20, 10], [30, 5], [42.5, 3], [50, 1]]);
  assert.deepEqual(w[2].plates, [10, 1.25]);
});

test('빈봉 이하 단계 생략', () => {
  const w = warmupSets(30, eq, WARMUP_STEPS); // 15→생략, 21→20 생략, 25.5→25
  assert.deepEqual(w.map((s) => s.weight), [20, 25]);
  assert.deepEqual(warmupSets(20, eq, WARMUP_STEPS), []);
  assert.deepEqual(warmupSets(null, eq, WARMUP_STEPS), []);
});

test('설정 바꾼 봉/원판', () => {
  const w = warmupSets(100, { bar: 15, plates: [20, 10, 5, 2.5] }, WARMUP_STEPS);
  assert.deepEqual(w.map((s) => s.weight), [15, 50, 70, 85]);
});
