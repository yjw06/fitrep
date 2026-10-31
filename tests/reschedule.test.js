import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proposals, isValidSchedule, weekSchedule } from '../js/logic/reschedule.js';
import { SESSIONS, WEEK_PLAN } from '../data/program.js';

const gym = [1, 2, 3, 4, 5, 6];

test('규칙 검사: 같은 부위 48시간, 하체A·B 연달아 금지, 하루 1세션', () => {
  const ok = [{ key: 'UA', date: '2026-11-02' }, { key: 'LA', date: '2026-11-03' }, { key: 'UB', date: '2026-11-05' }, { key: 'LB', date: '2026-11-06' }];
  assert.equal(isValidSchedule(ok, SESSIONS), true);
  assert.equal(isValidSchedule([{ key: 'UA', date: '2026-11-02' }, { key: 'UB', date: '2026-11-03' }], SESSIONS), false);
  // 하체끼리 2일 간격이어도 사이에 세션이 없으면 금지
  assert.equal(isValidSchedule([{ key: 'LA', date: '2026-11-03' }, { key: 'LB', date: '2026-11-05' }], SESSIONS), false);
  assert.equal(isValidSchedule([{ key: 'LA', date: '2026-11-03' }, { key: 'UB', date: '2026-11-04' }, { key: 'LB', date: '2026-11-05' }], SESSIONS), true);
  assert.equal(isValidSchedule([{ key: 'UA', date: '2026-11-02' }, { key: 'LA', date: '2026-11-02' }], SESSIONS), false);
});

test('화요일 하체A 패스 → 차이 적은 순 재배치안(최대 3개)', () => {
  const r = proposals({ from: '2026-11-03', done: [{ key: 'UA', date: '2026-11-02' }], remaining: ['LA', 'UB', 'LB'], gymDays: gym, sessions: SESSIONS });
  assert.ok(r.length >= 1 && r.length <= 3);
  for (const p of r) {
    assert.deepEqual(p.skip, []);
    const list = [{ key: 'UA', date: '2026-11-02' }, ...Object.entries(p.assign).map(([date, key]) => ({ date, key }))];
    assert.equal(isValidSchedule(list, SESSIONS), true);
    assert.ok(Object.keys(p.assign).every((d) => d > '2026-11-03'));
  }
  // 비용 오름차순
  assert.deepEqual(r.map((p) => p.cost), [...r.map((p) => p.cost)].sort((a, b) => a - b));
  // 최선안: 수 LA, 목 UB, 금? (LA-LB 사이 UB 필요) → 수 LA / 목 UB / 금 LB 비용 1
  assert.deepEqual(r[0].assign, { '2026-11-04': 'LA', '2026-11-05': 'UB', '2026-11-06': 'LB' });
  assert.equal(r[0].cost, 1);
});

test('날이 부족하면 생략할 세션 제안', () => {
  // 금요일에 상체B·하체B 둘 다 남음, 토요일만 가능 → 하나만 배치
  const r = proposals({ from: '2026-11-06', done: [{ key: 'UA', date: '2026-11-02' }, { key: 'LA', date: '2026-11-03' }], remaining: ['UB', 'LB'], gymDays: gym, sessions: SESSIONS });
  assert.ok(r.length >= 1);
  assert.equal(r[0].skip.length, 1);
  assert.equal(Object.keys(r[0].assign).length, 1);
  // LB만 토요일: LA(화)와 사이에 세션 없음 → 금지, 따라서 UB가 배치되고 LB 생략
  assert.deepEqual(r[0].assign, { '2026-11-07': 'UB' });
  assert.deepEqual(r[0].skip, ['LB']);
});

test('헬스장 가능 요일·막힌 날 반영, 아무것도 못 넣으면 전부 생략안', () => {
  const r = proposals({ from: '2026-11-03', done: [], remaining: ['LA'], gymDays: [3], sessions: SESSIONS, blocked: ['2026-11-04'] });
  assert.deepEqual(r, [{ assign: {}, skip: ['LA'], cost: 0 }]);
  const inc = proposals({ from: '2026-11-03', includeFrom: true, done: [], remaining: ['LA'], gymDays: [2], sessions: SESSIONS });
  assert.deepEqual(inc[0].assign, { '2026-11-03': 'LA' });
});

test('주간 일정: 재편성 적용 이후만 교체', () => {
  const base = weekSchedule('2026-11-02', WEEK_PLAN, null);
  assert.equal(base['2026-11-02'], 'UA');
  assert.equal(base['2026-11-04'], null);
  const s = weekSchedule('2026-11-02', WEEK_PLAN, { applied: { from: '2026-11-03', assign: { '2026-11-04': 'LA', '2026-11-05': 'UB', '2026-11-06': 'LB' }, skip: [] } });
  assert.deepEqual([s['2026-11-02'], s['2026-11-03'], s['2026-11-04'], s['2026-11-05'], s['2026-11-06']], ['UA', null, 'LA', 'UB', 'LB']);
});
