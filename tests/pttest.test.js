import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testAnchor, isTestDay, nextTestDate, latestTestValues, upsertTest, testSeries } from '../js/logic/pttest.js';

test('기준일·격주 일요일', () => {
  assert.equal(testAnchor({ startDate: '2026-11-02', testAnchorDate: null }), '2026-11-08');
  assert.equal(testAnchor({ startDate: '2026-11-02', testAnchorDate: '2026-11-15' }), '2026-11-15');
  assert.equal(isTestDay('2026-11-22', '2026-11-08'), true);
  assert.equal(isTestDay('2026-11-15', '2026-11-08'), false);
  assert.equal(isTestDay('2026-11-01', '2026-11-08'), false);
  assert.equal(isTestDay('2026-11-01', null), false);
  assert.equal(nextTestDate('2026-11-09', '2026-11-08'), '2026-11-22');
  assert.equal(nextTestDate('2026-11-22', '2026-11-08'), '2026-11-22');
  assert.equal(nextTestDate('2026-11-01', '2026-11-08'), '2026-11-08');
});

test('항목별 최신 값', () => {
  const tests = [
    { date: '2026-10-18', pullups: 1, pushups: 50, situps: 60 },
    { date: '2026-11-01', pullups: 2, pushups: 55, situps: null },
  ];
  assert.deepEqual(latestTestValues(tests), { pullups: 2, pushups: 55, situps: 60 });
  assert.deepEqual(latestTestValues([]), { pullups: null, pushups: null, situps: null });
});

test('같은 날 기록 병합·시계열', () => {
  let id = 0;
  const mk = () => `t${++id}`;
  let t = upsertTest([], '2026-11-08', { pullups: 3 }, mk);
  t = upsertTest(t, '2026-11-08', { pushups: 55, situps: 62 }, mk);
  assert.equal(t.length, 1);
  assert.deepEqual([t[0].pullups, t[0].pushups, t[0].situps], [3, 55, 62]);
  t = upsertTest(t, '2026-11-22', { pullups: 4 }, mk);
  assert.equal(t.length, 2);
  assert.deepEqual(testSeries(t, 'pullups').map((x) => x.value), [3, 4]);
  assert.deepEqual(testSeries(t, 'pushups').map((x) => x.value), [55]);
});
