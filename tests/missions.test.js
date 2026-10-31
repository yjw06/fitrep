import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missionsFor, latestTestValues, sixty, intervalPace, isTestDay, isRecordable, missionShort, weekMissions } from '../js/logic/missions.js';
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

test('결과를 기록할 요일: 월·화·수·금·토(스킬), 목(달리기만)·일(휴식) 제외', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((d) => isRecordable(d, P)), [true, true, true, false, true, true, false]);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((d) => missionShort(d, P)), ['윗몸', '팔굽', '스킬+윗몸', '달리기', '팔굽+윗몸', '스킬', '휴식']);
  assert.equal(missionShort(7, P, true), '검정');
});

test('이번 주 체력단련 결과 집계', () => {
  const missions = {
    '2026-11-02': { status: 'done' }, '2026-11-03': { status: 'partial' }, '2026-11-04': { status: 'skip' },
    '2026-11-05': { status: 'done' }, // 목(달리기만)은 집계 제외
    '2026-10-30': { status: 'done' }, // 지난주
  };
  const w = weekMissions({ monday: '2026-11-02', today: '2026-11-05', missions, program: P, anchor: '2026-11-08' });
  assert.deepEqual([w.done, w.partial, w.skip, w.required], [1, 1, 1, 5]);
  assert.deepEqual(w.days.map((d) => d.status), ['done', 'partial', 'skip', 'done', null, null, null]);
  assert.deepEqual(w.days.map((d) => d.future), [false, false, false, false, true, true, true]);
  assert.equal(w.days[6].label, '검정'); // 11/8 = 검정 기준일
});
