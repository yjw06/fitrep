import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankIndex, rankInfo, ua1Item } from '../js/logic/rank.js';
import { buildPlan, buildSteps } from '../js/logic/plan.js';
import * as P from '../data/program.js';

const R = P.PULLUP_RANKS;

test('계급 판정: 이병 0~2 / 일병 3~5 / 상병 6~9 / 병장 10+', () => {
  assert.deepEqual([0, 1, 2, 3, 5, 6, 9, 10, 15, null].map((n) => R[rankIndex(n, R)].name),
    ['이병', '이병', '이병', '일병', '일병', '상병', '상병', '병장', '병장', '이병']);
  const i = rankInfo(4, R);
  assert.equal(i.next.name, '상병');
  assert.equal(i.toNext, 2);
  assert.equal(rankInfo(12, R).next, null);
});

test('상체A 1번 처방', () => {
  assert.deepEqual(ua1Item(R[0], 2), { ex: 'negPullup', sets: 3, reps: [3, 3], note: R[0].ua1.note });
  const c = ua1Item(R[1], 4);
  assert.deepEqual([c.ex, c.sets, c.reps, c.rest], ['clusterPullup', 6, [1, 2], 45]);
  assert.deepEqual(ua1Item(R[2], 8).reps, [6, 6]); // 2개 남기고
  assert.deepEqual(ua1Item(R[2], 6).reps, [4, 4]);
  const w = ua1Item(R[3], 12);
  assert.deepEqual([w.ex, w.sets, w.reps], ['weightedPullup', 4, [5, 5]]);
});

test('buildPlan이 UA1 슬롯을 계급 처방으로 교체(휴식 포함)', () => {
  const ctx = { week: 2, deloadEvery: 5, negStage: 0, negStages: P.NEGATIVE_STAGES, alts: {}, exercises: P.EXERCISES };
  const pvt = buildPlan(P.SESSIONS.UA, { ...ctx, pullup: { rank: R[0], max: 1 } });
  assert.equal(pvt.entries[0].ex, 'negPullup');
  const pfc = buildPlan(P.SESSIONS.UA, { ...ctx, pullup: { rank: R[1], max: 3 } });
  assert.equal(pfc.entries[0].ex, 'clusterPullup');
  assert.equal(pfc.slots[0].rest, 45);
  assert.equal(buildSteps(pfc).filter((s) => s.slotId === 'UA1').length, 6);
  const sgt = buildPlan(P.SESSIONS.UA, { ...ctx, week: 5, pullup: { rank: R[3], max: 10 } });
  assert.equal(sgt.entries[0].presc.sets, 2); // 정비 주간 절반
  // 다른 세션은 영향 없음
  assert.equal(buildPlan(P.SESSIONS.UB, { ...ctx, pullup: { rank: R[3], max: 10 } }).entries[0].ex, 'latPulldown');
});
