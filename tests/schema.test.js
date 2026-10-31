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
