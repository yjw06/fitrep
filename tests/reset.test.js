import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resetWorkout, resetCounts, resetStartDate } from '../js/logic/reset.js';
import { defaultState } from '../js/logic/schema.js';

function sample() {
  const s = defaultState();
  Object.assign(s.settings, { callsign: 'EAGLE', startDate: '2026-11-02', goals: { pullups: 10, pushups: 72, situps: 86, run3kSec: 750 }, incOverride: { legPress: 10 }, alts: { 'UA2.0': 'smithBench' } });
  Object.assign(s, {
    setupDone: true,
    sessions: [{ id: 's1', key: 'UA', date: '2026-11-02', entries: [] }],
    targets: { bench: { weight: 62.5 } },
    exState: { negPullup: { stage: 1 } },
    reschedule: { '2026-11-02': { passes: [{ date: '2026-11-03' }], applied: null } },
    active: { id: 'a', key: 'LA' },
    missions: { '2026-11-02': { status: 'done' } },
    skillLogs: [{ date: '2026-11-04' }],
    intervals: [{ date: '2026-11-07', laps: [98] }],
    tests: [{ id: 't', date: '2026-10-31', pullups: 3 }],
    drill: { type: 'skill' },
  });
  return s;
}

test('기본(헬스 + 체력단련): 기록만 지우고 설정·검정은 유지, 시작일 변경', () => {
  const before = sample();
  const copy = JSON.parse(JSON.stringify(before));
  const s = resetWorkout(before, { gym: true, pt: true, startDate: '2026-11-09' });
  assert.deepEqual([s.sessions, s.targets, s.exState, s.reschedule, s.active], [[], {}, {}, {}, null]);
  assert.deepEqual([s.missions, s.skillLogs, s.intervals, s.drill], [{}, [], [], null]);
  assert.equal(s.tests.length, 1);
  assert.equal(s.settings.startDate, '2026-11-09');
  assert.equal(s.settings.callsign, 'EAGLE');
  assert.deepEqual(s.settings.incOverride, { legPress: 10 });
  assert.deepEqual(s.settings.alts, { 'UA2.0': 'smithBench' });
  assert.equal(s.setupDone, true);
  assert.deepEqual(before, copy); // 원본은 그대로
});

test('검정만: 검정 기록과 진행 중 2분 모드만, 헬스 세션 진행 중이면 유지', () => {
  const st = { ...sample(), drill: { type: 'pttest' } };
  const s = resetWorkout(st, { tests: true });
  assert.deepEqual(s.tests, []);
  assert.equal(s.drill, null);
  assert.equal(s.sessions.length, 1);
  assert.equal(s.active.key, 'LA');
  assert.equal(s.settings.startDate, '2026-11-02');
  // 체력단련만 지울 땐 진행 중 2분 모드는 건드리지 않음
  assert.equal(resetWorkout(st, { pt: true }).drill.type, 'pttest');
});

test('헬스만 지우면서 시작일을 안 주면 그대로', () => {
  const s = resetWorkout(sample(), { gym: true });
  assert.equal(s.settings.startDate, '2026-11-02');
  assert.equal(s.missions['2026-11-02'].status, 'done');
});

test('기본 시작일·지울 개수', () => {
  assert.equal(resetStartDate('2026-11-02', '2026-10-31'), '2026-11-02'); // 시작 전이면 그대로
  assert.equal(resetStartDate('2026-11-02', '2026-11-02'), '2026-11-02');
  assert.equal(resetStartDate('2026-11-02', '2026-11-08'), '2026-11-09'); // 시작했으면 다가오는 월요일
  assert.equal(resetStartDate(null, '2026-11-03'), '2026-11-09');
  assert.deepEqual(resetCounts(sample()), { sessions: 1, missions: 1, skillLogs: 1, intervals: 1, tests: 1 });
});
