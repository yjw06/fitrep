import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testAnchor, isTestDay, nextTestDate, cumulativeTarget, cuePoints, ptPhase, upsertTest, goalProgress, testSeries } from '../js/logic/pttest.js';

test('기준일·격주 일요일', () => {
  assert.equal(testAnchor({ startDate: '2026-11-02', testAnchorDate: null }), '2026-11-08');
  assert.equal(testAnchor({ startDate: '2026-11-02', testAnchorDate: '2026-11-15' }), '2026-11-15');
  assert.equal(isTestDay('2026-11-22', '2026-11-08'), true);
  assert.equal(isTestDay('2026-11-15', '2026-11-08'), false);
  assert.equal(isTestDay('2026-11-01', '2026-11-08'), false);
  assert.equal(nextTestDate('2026-11-09', '2026-11-08'), '2026-11-22');
  assert.equal(nextTestDate('2026-11-22', '2026-11-08'), '2026-11-22');
  assert.equal(nextTestDate('2026-11-01', '2026-11-08'), '2026-11-08');
});

test('2분 모드: 30초마다 목표 누적, 단계', () => {
  assert.deepEqual(cuePoints(120, 30), [30, 60, 90]);
  assert.deepEqual([30, 60, 90, 120].map((t) => cumulativeTarget(72, t, 120)), [18, 36, 54, 72]);
  assert.equal(cumulativeTarget(null, 30, 120), null);
  const d = { startAt: 0, countdown: 3, sec: 120 };
  assert.deepEqual(ptPhase(d, 500), { phase: 'countdown', countdownLeft: 3, elapsed: 0, left: 120 });
  assert.equal(ptPhase(d, 2500).countdownLeft, 1);
  const r = ptPhase(d, 33000);
  assert.deepEqual([r.phase, r.elapsed, r.left], ['run', 30, 90]);
  assert.equal(ptPhase(d, 200000).phase, 'done');
});

test('같은 날 검정 기록 병합', () => {
  let id = 0;
  const mk = () => `t${++id}`;
  let t = upsertTest([], '2026-11-08', { pushups: 55, mode: 'timed' }, mk);
  t = upsertTest(t, '2026-11-08', { situps: 62, mode: 'timed' }, mk);
  t = upsertTest(t, '2026-11-08', { pullups: 3, mode: 'manual' }, mk);
  assert.equal(t.length, 1);
  assert.deepEqual([t[0].pushups, t[0].situps, t[0].pullups, t[0].mode], [55, 62, 3, 'timed']);
  t = upsertTest(t, '2026-11-22', { pushups: 58 }, mk);
  assert.equal(t.length, 2);
});

test('목표 진행률·시계열', () => {
  assert.equal(goalProgress(36, 72), 0.5);
  assert.equal(goalProgress(80, 72), 1);
  assert.equal(goalProgress(800, 750, true), 750 / 800);
  assert.equal(goalProgress(700, 750, true), 1);
  assert.equal(goalProgress(null, 72), null);
  assert.deepEqual(testSeries([{ date: '2026-11-22', pushups: 58 }, { date: '2026-11-08', pushups: 55 }, { date: '2026-11-15', pushups: null }], 'pushups').map((x) => x.value), [55, 58]);
});
