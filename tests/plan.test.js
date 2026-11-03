import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, buildSteps, restMid, remainingSec, guard, trimTarget, nextStepIndex, prescribe } from '../js/logic/plan.js';
import * as P from '../data/program.js';

const ctx = (week = 2, extra = {}) => ({ week, deloadEvery: 5, negStage: 0, negStages: P.NEGATIVE_STAGES, alts: {}, exercises: P.EXERCISES, ...extra });
const item = (day, slot, i = 0) => P.SESSIONS[day].slots[slot].items[i];

test('휴식 범위 중간값(5초 단위)', () => {
  assert.equal(restMid([120, 180]), 150);
  assert.equal(restMid([45, 60]), 55);
  assert.equal(restMid([90, 90]), 90);
});

test('1주차는 전 종목 RIR 3, 2주차부터 루틴 RIR(고립은 마지막 세트만), 정비 주간 세트 절반(올림)', () => {
  const bench = item('mon', 0);
  assert.deepEqual(prescribe(bench, P.EXERCISES.bench_press, ctx(1)).rir, [3, 3]);
  assert.deepEqual(prescribe(bench, P.EXERCISES.bench_press, ctx(2)).rir, [2, 2]);
  const fly = item('mon', 3, 0);
  const w1 = prescribe(fly, P.EXERCISES.low_to_high_cable_fly, ctx(1));
  assert.deepEqual([w1.rir, w1.rirLastOnly], [[3, 3], false]);
  const w2 = prescribe(fly, P.EXERCISES.low_to_high_cable_fly, ctx(2));
  assert.deepEqual([w2.rir, w2.rirLastOnly], [[0, 1], true]);
  assert.equal(prescribe(bench, P.EXERCISES.bench_press, ctx(5)).sets, 2);
  assert.equal(prescribe(item('tue', 0), P.EXERCISES.negative_pullup, ctx(5)).sets, 2);
  assert.equal(prescribe(item('thu', 3, 1), P.EXERCISES.smith_calf_raise, ctx(10)).sets, 2);
  assert.equal(prescribe(item('tue', 0), P.EXERCISES.negative_pullup, ctx(1)).rir, null);
});

test('네거티브 단계 반영', () => {
  const p = prescribe(item('tue', 0), P.EXERCISES.negative_pullup, ctx(2, { negStage: 2 }));
  assert.deepEqual([p.sets, p.reps, p.tempo], [3, [5, 5], 8]);
});

test('대체 종목: 같은 처방(스미스 벤치) / 자기 처방(딥스 → 케이블 플라이 3×12~15), 슬롯별로 기억', () => {
  const plan = buildPlan(P.SESSIONS.mon, ctx(2, { alts: { 'mon1.0': 'smith_bench_press' } }));
  assert.equal(plan.entries[0].ex, 'smith_bench_press');
  assert.deepEqual(plan.entries[0].options, ['bench_press', 'smith_bench_press']);
  assert.deepEqual(plan.entries[0].presc.reps, [5, 6]);
  assert.equal(buildPlan(P.SESSIONS.mon, ctx(2, { alts: { 'mon1.0': 'deadlift' } })).entries[0].ex, 'bench_press');
  const dip = buildPlan(P.SESSIONS.mon, ctx(2)).entries[2];
  assert.equal(dip.ex, 'assisted_dip');
  assert.deepEqual([dip.presc.reps, dip.presc.rir], [[8, 10], [2, 2]]);
  assert.deepEqual([dip.prescs.high_to_low_cable_fly.reps, dip.prescs.high_to_low_cable_fly.rir, dip.prescs.high_to_low_cable_fly.rirLastOnly], [[12, 15], [0, 1], true]);
});

test('슈퍼세트 A→B 후 휴식, 세트 수가 다르면 남은 쪽만', () => {
  const plan = buildPlan(P.SESSIONS.wed, ctx(2));
  const steps = buildSteps(plan).filter((s) => s.slotId === 'wed3');
  assert.deepEqual(steps.map((s) => `${plan.entries[s.entry].ex}${s.set + 1}:${s.restAfter}`), [
    'db_lateral_raise1:0', 'rear_delt_machine1:60', 'db_lateral_raise2:0', 'rear_delt_machine2:60',
    'db_lateral_raise3:0', 'rear_delt_machine3:60', 'db_lateral_raise4:60']);
});

test('남은 시간·60분 가드', () => {
  const plan = buildPlan(P.SESSIONS.mon, ctx(2));
  const steps = buildSteps(plan);
  // 월: 벤치 4 + 인클라인 3 + 딥스 3 + (플라이 3 + 펙덱 3) + 크런치 3 = 19세트
  assert.equal(steps.length, 19);
  const rest = steps.reduce((a, s) => a + s.restAfter, 0) - steps.at(-1).restAfter;
  assert.equal(remainingSec(plan, steps), 19 * 40 + rest);
  assert.ok(remainingSec(plan, steps) / 60 < P.GUARD.limitMin);
  plan.entries[0].sets.push({ w: 40, reps: 6 });
  assert.equal(nextStepIndex(plan, steps), 1);
  assert.equal(remainingSec(plan, steps, { restLeft: 30 }), 30 + 18 * 40 + rest - 150);
  const g = guard({ now: 1000_000, startedAt: 1000_000 - 50 * 60000, remaining: 15 * 60 });
  assert.deepEqual([g.over, Math.round(g.overSec)], [true, 300]);
  assert.equal(guard({ now: 0, startedAt: 0, remaining: 3000 }).over, false);
  assert.equal(P.GUARD.limitMin, 60);
});

test('시간 초과 감축: 마지막 슈퍼세트, 슈퍼세트 없는 날은 메인·턱걸이 뺀 마지막 종목', () => {
  const mon = buildPlan(P.SESSIONS.mon, ctx(2));
  assert.equal(trimTarget(mon, {}), 'mon4'); // 크런치(단일) 앞의 플라이 슈퍼세트
  assert.equal(buildSteps(mon, { mon4: 1 }).filter((s) => s.slotId === 'mon4').length, 4);
  const fri = buildPlan(P.SESSIONS.fri, ctx(2));
  assert.equal(trimTarget(fri, {}), 'fri6');
  const tue = buildPlan(P.SESSIONS.tue, ctx(2)); // 등: 슈퍼세트 없음
  assert.equal(trimTarget(tue, {}), 'tue6');
  assert.equal(trimTarget(tue, { tue6: 2, tue5: 2, tue4: 2, tue3: 2 }), null); // 데드·네거티브는 안 줄임
  // 이미 한 세트는 줄이지 않음
  const thu = buildPlan(P.SESSIONS.thu, ctx(2));
  thu.entries.filter((e) => e.slotId === 'thu4').forEach((e) => e.sets.push({}, {}, {}));
  assert.equal(trimTarget(thu, {}), 'thu4'); // 카프레이즈 4번째는 아직 줄일 수 있음
  assert.equal(trimTarget(thu, { thu4: 1 }), 'thu3');
});
