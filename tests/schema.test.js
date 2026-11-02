import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate, defaultState, makeBackup, readBackup, SCHEMA_VERSION } from '../js/logic/schema.js';
import { exerciseHistory, weekDone, judgeHistory } from '../js/logic/stats.js';

test('마이그레이션: 빈 값/부분 값 채움, 미래 버전 거부', () => {
  assert.equal(migrate(null).schema, SCHEMA_VERSION);
  const s = migrate({ settings: { callsign: 'EAGLE', inc: { dumbbell: 2.5 } }, sessions: 'x' });
  assert.equal(s.settings.callsign, 'EAGLE');
  assert.equal(s.settings.inc.dumbbell, 2.5);
  assert.equal(s.settings.inc.machine, 5);
  assert.deepEqual(s.sessions, []);
  assert.throws(() => migrate({ schema: SCHEMA_VERSION + 1 }));
});

test('백업 왕복', () => {
  const st = defaultState();
  st.settings.callsign = 'X';
  const back = readBackup(JSON.stringify(makeBackup(st, 0)));
  assert.equal(back.settings.callsign, 'X');
  assert.throws(() => readBackup('{"foo":1}'));
});

test('종목 이력·주간 진행', () => {
  const sessions = [
    { id: 'b', key: 'UA', date: '2026-11-09', week: 2, entries: [{ ex: 'bench', sets: [{ w: 62.5, reps: 6 }, { w: 62.5, reps: 5 }] }] },
    { id: 'a', key: 'UA', date: '2026-11-02', week: 1, entries: [{ ex: 'bench', sets: [{ w: 60, reps: 6 }] }] },
    { id: 'c', key: 'LA', date: '2026-11-10', week: 2, deload: true, entries: [{ ex: 'backSquat', sets: [{ w: 80, reps: 5 }] }] },
  ];
  const h = exerciseHistory(sessions, 'bench');
  assert.deepEqual(h.map((x) => [x.date, x.top.w, x.totalReps]), [['2026-11-02', 60, 6], ['2026-11-09', 62.5, 11]]);
  assert.deepEqual([...weekDone(sessions, '2026-11-12')].sort(), ['LA', 'UA']);
  assert.deepEqual(judgeHistory(sessions, 'backSquat'), []);
});

// 지금 스키마에서 빠진 기능의 저장값이 남아 있지 않은지
function assertLean(s) {
  for (const k of ['missions', 'skillLogs', 'intervals', 'drill', 'reschedule', 'bodyweight', 'protein']) assert.equal(k in s, false, k);
  for (const k of ['goals', 'shortcut', 'gymDays', 'proteinTarget', 'proteinPresets']) assert.equal(k in s.settings, false, `settings.${k}`);
}

test('v1 → 현재: 헬스 기록·검정·설정 유지, 빠진 기능 저장값 없음', () => {
  const v1 = {
    schema: 1, setupDone: true,
    settings: { callsign: 'EAGLE', startDate: '2026-11-02', goals: { pushups: 72, situps: 86, run3kSec: 750 }, alts: { 'UA2.0': 'smithBench' } },
    tests: [{ id: 't', date: '2026-10-31', pullups: 2, pushups: 50, situps: 60, mode: 'manual' }],
    sessions: [{ id: 's', key: 'UA', date: '2026-11-02', week: 1, entries: [{ ex: 'bench', sets: [{ w: 60, reps: 6 }] }] }],
    targets: { bench: { weight: 62.5 } }, exState: { negPullup: { stage: 1 } },
    reschedule: { '2026-11-02': { passes: [{ date: '2026-11-03', reason: '당직' }] } },
  };
  const s = migrate(v1);
  assert.equal(s.schema, SCHEMA_VERSION);
  assert.equal(s.settings.callsign, 'EAGLE');
  assert.equal(s.settings.startDate, '2026-11-02');
  assert.deepEqual(s.settings.alts, {}); // 슬롯 구성이 바뀌어 비움
  assert.equal(s.sessions.length, 1);
  assert.equal(s.targets.bench.weight, 62.5);
  assert.equal(s.exState.negPullup.stage, 1);
  assert.equal(s.tests[0].pullups, 2);
  assertLean(s);
});

test('v2·v4 → 현재: 체력단련·스킬·인터벌·재편성·목표·단축어 제거, 나머지 유지', () => {
  const v2 = {
    schema: 2, setupDone: true,
    settings: { callsign: 'EAGLE', startDate: '2026-11-02', gymDays: [1, 2, 4, 5], proteinTarget: [120, 150], proteinPresets: [{ name: '닭가슴살 200g', g: 45 }], testAnchorDate: '2026-11-08' },
    tests: [{ id: 't', date: '2026-11-03', pullups: 3, pushups: 72, situps: 60, mode: 'timed' }],
    sessions: [{ id: 's', key: 'UA', date: '2026-11-02', week: 1, entries: [] }],
    bodyweight: [{ date: '2026-11-03', kg: 70.1 }],
    protein: { '2026-11-03': [{ name: '닭가슴살 200g', g: 45 }] },
    intervals: [{ date: '2026-11-03', laps: [98] }],
    skillLogs: [{ date: '2026-11-04', rank: '일병', sets: [] }],
    reschedule: { '2026-11-02': { passes: [{ date: '2026-11-03', key: 'LA', reason: '당직' }], applied: null } },
  };
  const a = migrate(v2);
  assert.equal(a.schema, SCHEMA_VERSION);
  assert.equal(a.settings.testAnchorDate, '2026-11-08');
  assert.equal(a.tests[0].pullups, 3);
  assert.equal(a.sessions.length, 1);
  assertLean(a);

  const v4 = {
    schema: 4, setupDone: true,
    settings: { callsign: 'EAGLE', goals: { pullups: 10 }, shortcut: { enabled: true, name: 'x' }, gymDays: [1], theme: 'light', sound: false },
    missions: { '2026-11-02': { status: 'done' } }, skillLogs: [], intervals: [], reschedule: {}, drill: { type: 'skill' },
    sessions: [{ id: 's', key: 'LB', date: '2026-11-06', entries: [] }], active: null,
  };
  const b = migrate(v4);
  assert.equal(b.schema, SCHEMA_VERSION);
  assert.equal(b.settings.theme, 'light');
  assert.equal(b.settings.sound, false);
  assert.equal(b.sessions[0].key, 'LB');
  assertLean(b);
  // 새로 만든 상태에도 빠진 기능 필드가 없음
  assertLean(defaultState());
});
