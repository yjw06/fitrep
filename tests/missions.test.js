import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missionsFor, latestTestValues, sixty, intervalPace, isTestDay } from '../js/logic/missions.js';
import * as P from '../data/program.js';

const tests = [
  { date: '2026-10-18', pullups: 1, pushups: 50, situps: 60 },
  { date: '2026-11-01', pullups: 2, pushups: 55, situps: null },
];

test('최신 검정 값(항목별)', () => {
  assert.deepEqual(latestTestValues(tests), { pullups: 2, pushups: 55, situps: 60, run3kSec: null });
});

test('60% 반올림, 400m 페이스', () => {
  assert.equal(sixty(55), 33);
  assert.equal(sixty(61), 37);
  assert.equal(sixty(null), null);
  assert.equal(intervalPace(750), 100); // 12:30 → 1:40
});

test('요일별 미션', () => {
  const goals = { run3kSec: 750 };
  const fri = missionsFor(5, { tests, goals, program: P });
  assert.deepEqual(fri.map((m) => [m.type, m.sets, m.reps]), [['pushup', 5, 33], ['situp', 4, 36]]);
  const sat = missionsFor(6, { tests, goals, program: P });
  assert.equal(sat[0].steps.length, 4);
  assert.equal(sat[1].pace, 100);
  assert.equal(sat[1].optional, true);
  const mon = missionsFor(1, { tests: [], goals, program: P });
  assert.equal(mon[0].missing, true);
  assert.equal(missionsFor(4, { tests, goals, program: P })[0].type, 'run');
});

test('격주 검정일', () => {
  assert.equal(isTestDay('2026-11-15', '2026-11-01'), true);
  assert.equal(isTestDay('2026-11-08', '2026-11-01'), false);
  assert.equal(isTestDay('2026-11-01', null), false);
});
