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

test('v1 → v2 마이그레이션: 기존 기록 유지 + 2단계 필드', () => {
  const v1 = {
    schema: 1, setupDone: true,
    settings: { callsign: 'EAGLE', startDate: '2026-11-02', goals: { pushups: 72, situps: 86, run3kSec: 750 } },
    tests: [{ id: 't', date: '2026-10-31', pullups: 2, pushups: 50, situps: 60, mode: 'manual' }],
    sessions: [{ id: 's', key: 'UA', date: '2026-11-02', week: 1, entries: [{ ex: 'bench', sets: [{ w: 60, reps: 6 }] }] }],
    targets: { bench: { weight: 62.5 } }, exState: { negPullup: { stage: 1 } },
    reschedule: { '2026-11-02': { passes: [{ date: '2026-11-03', reason: '당직' }] } },
  };
  const s = migrate(v1);
  assert.equal(s.schema, 2);
  assert.equal(s.settings.callsign, 'EAGLE');
  assert.equal(s.settings.goals.pushups, 72);
  assert.equal(s.settings.goals.pullups, 10);
  assert.equal(s.sessions.length, 1);
  assert.equal(s.targets.bench.weight, 62.5);
  assert.equal(s.exState.negPullup.stage, 1);
  assert.deepEqual(s.reschedule['2026-11-02'], { passes: [{ date: '2026-11-03', reason: '당직' }], applied: null });
  assert.deepEqual(s.skillLogs, []);
  assert.equal(s.drill, null);
  assert.deepEqual(s.settings.proteinPresets.map((p) => p.g), [45, 31.5]);
});
