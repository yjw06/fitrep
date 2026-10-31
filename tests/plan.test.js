import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, buildSteps, restMid, remainingSec, guard, trimTarget, nextStepIndex, prescribe } from '../js/logic/plan.js';
import * as P from '../data/program.js';

const ctx = (week = 2, extra = {}) => ({ week, deloadEvery: 5, negStage: 0, negStages: P.NEGATIVE_STAGES, alts: {}, exercises: P.EXERCISES, ...extra });

test('휴식 범위 중간값(5초 단위)', () => {
  assert.equal(restMid([120, 180]), 150);
  assert.equal(restMid([45, 60]), 55);
  assert.equal(restMid([90, 90]), 90);
});

test('1주차 RIR 3, 2주차부터 표의 RIR, 정비 주간 세트 절반(올림)', () => {
  const item = P.SESSIONS.UA.slots[1].items[0];
  assert.deepEqual(prescribe(item, P.EXERCISES.bench, ctx(1)).rir, [3, 3]);
  assert.deepEqual(prescribe(item, P.EXERCISES.bench, ctx(2)).rir, [2, 2]);
  assert.equal(prescribe(P.SESSIONS.UA.slots[3].items[0], P.EXERCISES.tbarRow, ctx(2)).rir, null);
  const d = prescribe(item, P.EXERCISES.bench, ctx(5));
  assert.equal(d.sets, 2);
  assert.equal(prescribe(P.SESSIONS.UA.slots[0].items[0], P.EXERCISES.negPullup, ctx(5)).sets, 2);
  assert.equal(prescribe(P.SESSIONS.UB.slots[4].items[0], P.EXERCISES.cableLateral, ctx(10)).sets, 2);
});

test('네거티브 단계 반영', () => {
  const p = prescribe(P.SESSIONS.UA.slots[0].items[0], P.EXERCISES.negPullup, ctx(2, { negStage: 2 }));
  assert.deepEqual([p.sets, p.reps, p.tempo], [3, [5, 5], 8]);
});

test('대체 종목 선택은 슬롯별로 기억', () => {
  const plan = buildPlan(P.SESSIONS.UA, ctx(2, { alts: { 'UA2.0': 'smithBench' } }));
  assert.equal(plan.entries[1].ex, 'smithBench');
  assert.deepEqual(plan.entries[1].options, ['bench', 'smithBench']);
  const bad = buildPlan(P.SESSIONS.UA, ctx(2, { alts: { 'UA2.0': 'deadlift' } }));
  assert.equal(bad.entries[1].ex, 'bench');
});

test('슈퍼세트 A→B 후 휴식, 세트 수가 다르면 남은 쪽만', () => {
  const plan = buildPlan(P.SESSIONS.UA, ctx(2));
  const steps = buildSteps(plan).filter((s) => s.slotId === 'UA5');
  const names = steps.map((s) => `${plan.entries[s.entry].ex}${s.set + 1}:${s.restAfter}`);
  assert.deepEqual(names, ['dbLateral1:0', 'ezCurl1:60', 'dbLateral2:0', 'ezCurl2:60', 'dbLateral3:0', 'ezCurl3:60', 'dbLateral4:60']);
});

test('남은 시간·60분 가드', () => {
  const plan = buildPlan(P.SESSIONS.UA, ctx(2));
  const steps = buildSteps(plan);
  // UA: 3+4+3+3+(4+3)=20세트
  assert.equal(steps.length, 20);
  const rest = steps.reduce((a, s) => a + s.restAfter, 0) - steps.at(-1).restAfter;
  assert.equal(remainingSec(plan, steps), 20 * 40 + rest);
  // 첫 세트 완료 후 + 진행 중 휴식 30초
  plan.entries[0].sets.push({ w: 0, reps: 3 });
  assert.equal(nextStepIndex(plan, steps), 1);
  assert.equal(remainingSec(plan, steps, { restLeft: 30 }), 30 + 19 * 40 + rest - 90);
  const g = guard({ now: 1000_000, startedAt: 1000_000 - 50 * 60000, remaining: 15 * 60 });
  assert.equal(g.over, true);
  assert.equal(Math.round(g.overSec), 300);
  assert.equal(guard({ now: 0, startedAt: 0, remaining: 3000 }).over, false);
});

test('마지막 슈퍼세트 1세트 감축', () => {
  const plan = buildPlan(P.SESSIONS.UB, ctx(2));
  assert.equal(trimTarget(plan, {}), 'UB6');
  const trim = { UB6: 1 };
  const steps = buildSteps(plan, trim).filter((s) => s.slotId === 'UB6');
  assert.equal(steps.length, 3); // 오버헤드 2 + 컬 1
    assert.equal(trimTarget(plan, { UB6: 2 }), 'UB5'); // 3-2=1, 2-2=0 → 더 줄일 게 없음
  // 이미 한 세트는 줄이지 않음
  plan.entries.filter((e) => e.slotId === 'UB6').forEach((e) => e.sets.push({}, {}));
  assert.equal(trimTarget(plan, {}), 'UB6'); // 익스텐션 3번째는 아직 줄일 수 있음
  assert.equal(trimTarget(plan, { UB6: 1 }), 'UB5');
});
