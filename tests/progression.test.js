import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judgeExercise, incrementFor, isStalled, topSet, nextNegStage, firstWeekBump } from '../js/logic/progression.js';
import { defaultSettings } from '../js/logic/schema.js';
import { EXERCISES as X, FIRST_WEEK } from '../data/program.js';

const S = defaultSettings();
const sets = (w, reps, rir = null) => reps.map((r) => ({ w, reps: r, rir }));
const main = { sets: 4, reps: [5, 6], rir: [2, 2] };
const judge = (exId, presc, s, extra = {}) => judgeExercise({ exId, ex: X[exId], presc, sets: s, settings: S, ...extra });

test('증가폭: 루틴 파일 kg > 머신·덤벨 한 칸(설정) > 어시스트, 종목별 설정이 최우선', () => {
  assert.equal(incrementFor('bench_press', X.bench_press, S), 2.5);
  assert.equal(incrementFor('back_squat', X.back_squat, S), 5);
  assert.equal(incrementFor('romanian_deadlift', X.romanian_deadlift, S), 5);
  assert.equal(incrementFor('smith_calf_raise', X.smith_calf_raise, S), 5);
  assert.equal(incrementFor('pec_deck_fly', X.pec_deck_fly, S), 5);
  assert.equal(incrementFor('db_lateral_raise', X.db_lateral_raise, S), 2);
  assert.equal(incrementFor('db_lateral_raise', X.db_lateral_raise, { ...S, inc: { ...S.inc, dumbbell: 1 } }), 1);
  assert.equal(incrementFor('assisted_dip', X.assisted_dip, S), 5);
  assert.equal(incrementFor('leg_press', X.leg_press, { ...S, incOverride: { leg_press: 10 } }), 10);
});

test('메인: 전 세트 윗끝 + RIR 유지 → 루틴 증가폭', () => {
  const r = judge('bench_press', main, sets(60, [6, 6, 6, 6], 2));
  assert.deepEqual([r.action, r.weight], ['increase', 62.5]);
  assert.equal(judge('back_squat', main, sets(80, [6, 6, 6, 6], 3)).weight, 85);
  assert.equal(judge('standing_ohp', main, sets(30, [6, 6, 6, 6], 2)).weight, 32.5);
  assert.equal(judge('deadlift', { sets: 3, reps: [4, 5], rir: [2, 2] }, sets(80, [5, 5, 5], 2)).weight, 85);
});

test('메인: RIR 목표 미유지 / 윗끝 미달 / 세트 미완료 → 유지(RIR 미입력은 통과)', () => {
  const r1 = judge('bench_press', main, [...sets(60, [6, 6, 6], 2), { w: 60, reps: 6, rir: 1 }]);
  assert.deepEqual([r1.action, r1.weight], ['hold', 60]);
  assert.match(r1.reason, /RIR/);
  assert.equal(judge('bench_press', main, sets(60, [6, 6, 6, 5], 2)).action, 'hold');
  assert.equal(judge('bench_press', main, sets(60, [6, 6, 6], 2)).action, 'hold');
  assert.equal(judge('bench_press', main, sets(60, [6, 6, 6, 6])).action, 'increase');
});

test('보조·고립: 전 세트 윗끝 → 한 단계, 고정 반복(3×10)은 전 세트 달성 = 윗끝', () => {
  assert.equal(judge('db_lateral_raise', { sets: 4, reps: [12, 15] }, sets(8, [15, 15, 15, 15])).weight, 10);
  assert.equal(judge('pec_deck_fly', { sets: 3, reps: [12, 15] }, sets(30, [15, 15, 15])).weight, 35);
  assert.equal(judge('pec_deck_fly', { sets: 3, reps: [12, 15] }, sets(30, [15, 14, 15])).action, 'hold');
  assert.equal(judge('cable_pallof_press', { sets: 3, reps: [10, 10] }, sets(15, [10, 10, 10])).weight, 20);
});

test('어시스트: 풀업·친업 3×8 / 딥스 3×10 → 보조 −5kg, 0 아래로 안 감', () => {
  const pull = { sets: 3, reps: [6, 8], rir: [1, 2] };
  assert.equal(judge('assisted_pullup', pull, sets(30, [8, 8, 8])).weight, 25);
  assert.equal(judge('assisted_pullup', pull, sets(3, [8, 8, 8])).weight, 0);
  assert.equal(judge('assisted_pullup', pull, sets(30, [8, 7, 8])).action, 'hold');
  const dip = { sets: 3, reps: [8, 10], rir: [2, 2] };
  assert.equal(judge('assisted_dip', dip, sets(20, [10, 10, 10])).weight, 15);
  assert.equal(judge('assisted_dip', dip, sets(20, [10, 9, 10])).action, 'hold');
  assert.equal(judge('assisted_chinup', pull, sets(25, [8, 8, 8])).weight, 20);
});

test('정체: 같은 무게 2주 연속 총 반복 제자리 → 10% 낮춘 무게(증가폭 단위)', () => {
  assert.equal(isStalled([{ weight: 60, totalReps: 22 }, { weight: 60, totalReps: 22 }, { weight: 60, totalReps: 21 }]), true);
  assert.equal(isStalled([{ weight: 60, totalReps: 22 }, { weight: 60, totalReps: 23 }, { weight: 60, totalReps: 23 }]), false);
  assert.equal(isStalled([{ weight: 57.5, totalReps: 22 }, { weight: 60, totalReps: 22 }, { weight: 60, totalReps: 22 }]), false);
  const r = judge('bench_press', main, sets(60, [6, 5, 5, 5], 2), { history: [{ weight: 60, totalReps: 21 }, { weight: 60, totalReps: 21 }] });
  assert.deepEqual([r.action, r.weight], ['stall', 55]);
  assert.equal(judge('back_squat', main, sets(100, [5, 5, 5, 5], 2), { history: [{ weight: 100, totalReps: 20 }, { weight: 100, totalReps: 20 }] }).weight, 90);
});

test('정비 주간·네거티브·맨몸·기록 없음', () => {
  assert.equal(judge('bench_press', { ...main, sets: 2 }, sets(60, [6, 6], 2), { deload: true }).action, 'hold');
  assert.equal(judge('negative_pullup', { sets: 3, reps: [3, 3] }, sets(0, [3, 3, 3])).action, 'check');
  assert.equal(judge('cluster_pullup', { sets: 6, reps: [1, 2] }, sets(0, [2, 2, 2, 2, 2, 2])).action, 'note');
  assert.equal(judge('bench_press', main, []).action, 'skip');
});

test('톱세트·네거티브 단계', () => {
  assert.deepEqual(topSet([{ w: 60, reps: 6 }, { w: 62.5, reps: 4 }, { w: 62.5, reps: 5 }]), { w: 62.5, reps: 5 });
  assert.deepEqual(topSet([{ w: 30, reps: 8 }, { w: 25, reps: 6 }], 'assist'), { w: 25, reps: 6 });
  assert.equal(nextNegStage(0, true, 2), 1);
  assert.equal(nextNegStage(2, true, 2), 2);
  assert.equal(nextNegStage(1, false, 2), 1);
});

test('1주차: 정해진 반복 했는데 3개 넘게 남으면(RIR 4+) 다음 세트에 올림', () => {
  const b = (exId, presc, set, week = 1) => firstWeekBump({ week, exId, ex: X[exId], presc, set, settings: S, rule: FIRST_WEEK });
  const p = { sets: 4, reps: [5, 6], rir: [3, 3] };
  assert.equal(b('bench_press', p, { w: 40, reps: 6, rir: 4 }).w, 42.5); // 상체 2.5~5
  assert.equal(b('back_squat', p, { w: 40, reps: 6, rir: 4 }).w, 45); // 하체 5~10
  assert.equal(b('pec_deck_fly', { sets: 3, reps: [12, 15] }, { w: 30, reps: 15, rir: 4 }).w, 35); // 머신 한 칸 5 (2.5~5 안)
  assert.equal(b('db_lateral_raise', { sets: 4, reps: [12, 15] }, { w: 5, reps: 15, rir: 4 }).w, 7.5); // 덤벨 2 → 최소 2.5
  assert.equal(b('assisted_pullup', { sets: 3, reps: [6, 8] }, { w: 30, reps: 8, rir: 4 }).w, 25); // 보조는 내림
  assert.match(b('bench_press', p, { w: 40, reps: 6, rir: 4 }).text, /\+2\.5kg/);
  assert.equal(b('bench_press', p, { w: 40, reps: 6, rir: 3 }), null); // 3개면 그대로
  assert.equal(b('bench_press', p, { w: 40, reps: 4, rir: 4 }), null); // 정해진 반복 미달
  assert.equal(b('bench_press', p, { w: 40, reps: 6, rir: 4 }, 2), null); // 2주차부터는 안 함
  assert.equal(b('negative_pullup', { sets: 3, reps: [3, 3] }, { w: 0, reps: 3, rir: 4 }), null);
});
