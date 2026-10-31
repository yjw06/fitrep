import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judgeExercise, incrementFor, isStalled, topSet, nextNegStage } from '../js/logic/progression.js';
import { defaultSettings } from '../js/logic/schema.js';
import { EXERCISES as X } from '../data/program.js';

const S = defaultSettings();
const sets = (w, reps, rir = null) => reps.map((r) => ({ w, reps: r, rir }));
const main = { sets: 4, reps: [5, 6], rir: [2, 2] };

test('증가폭: 메인 상/하체, 장비별, 종목별 설정', () => {
  assert.equal(incrementFor('bench', X.bench, S), 2.5);
  assert.equal(incrementFor('backSquat', X.backSquat, S), 5);
  assert.equal(incrementFor('dbLateral', X.dbLateral, S), 2);
  assert.equal(incrementFor('legPress', X.legPress, S), 5);
  assert.equal(incrementFor('cableRow', X.cableRow, S), 5);
  assert.equal(incrementFor('legPress', X.legPress, { ...S, incOverride: { legPress: 10 } }), 10);
});

test('메인: 전 세트 윗끝 + RIR 유지 → 상체 +2.5 / 하체 +5', () => {
  const r = judgeExercise({ exId: 'bench', ex: X.bench, presc: main, sets: sets(60, [6, 6, 6, 6], 2), settings: S });
  assert.equal(r.action, 'increase');
  assert.equal(r.weight, 62.5);
  const q = judgeExercise({ exId: 'backSquat', ex: X.backSquat, presc: main, sets: sets(80, [6, 6, 6, 6], 3), settings: S });
  assert.equal(q.weight, 85);
});

test('메인: RIR 목표 미유지 / 윗끝 미달 / 세트 미완료 → 유지', () => {
  const r1 = judgeExercise({ exId: 'bench', ex: X.bench, presc: main, sets: [...sets(60, [6, 6, 6], 2), { w: 60, reps: 6, rir: 1 }], settings: S });
  assert.equal(r1.action, 'hold');
  assert.equal(r1.weight, 60);
  assert.match(r1.reason, /RIR/);
  const r2 = judgeExercise({ exId: 'bench', ex: X.bench, presc: main, sets: sets(60, [6, 6, 6, 5], 2), settings: S });
  assert.equal(r2.action, 'hold');
  const r3 = judgeExercise({ exId: 'bench', ex: X.bench, presc: main, sets: sets(60, [6, 6, 6], 2), settings: S });
  assert.equal(r3.action, 'hold');
  // RIR 미기록은 통과로 본다
  const r4 = judgeExercise({ exId: 'bench', ex: X.bench, presc: main, sets: sets(60, [6, 6, 6, 6]), settings: S });
  assert.equal(r4.action, 'increase');
});

test('보조: 윗끝 → 한 단계 증량, 고정 반복은 전 세트 달성 = 윗끝', () => {
  const r = judgeExercise({ exId: 'dbLateral', ex: X.dbLateral, presc: { sets: 4, reps: [12, 15] }, sets: sets(8, [15, 15, 15, 15]), settings: S });
  assert.deepEqual([r.action, r.weight], ['increase', 10]);
  const p = judgeExercise({ exId: 'pallof', ex: X.pallof, presc: { sets: 3, reps: [10, 10] }, sets: sets(15, [10, 10, 10]), settings: S });
  assert.deepEqual([p.action, p.weight], ['increase', 20]);
  const h = judgeExercise({ exId: 'pallof', ex: X.pallof, presc: { sets: 3, reps: [10, 10] }, sets: sets(15, [10, 9, 10]), settings: S });
  assert.equal(h.action, 'hold');
});

test('어시스트 풀업: 3×8 달성 → 보조 −5kg, 0 아래로 안 감', () => {
  const presc = { sets: 3, reps: [6, 8], rir: [1, 2] };
  const r = judgeExercise({ exId: 'assistPullup', ex: X.assistPullup, presc, sets: sets(30, [8, 8, 8]), settings: S });
  assert.deepEqual([r.action, r.weight], ['increase', 25]);
  const z = judgeExercise({ exId: 'assistPullup', ex: X.assistPullup, presc, sets: sets(3, [8, 8, 8]), settings: S });
  assert.equal(z.weight, 0);
  const h = judgeExercise({ exId: 'assistPullup', ex: X.assistPullup, presc, sets: sets(30, [8, 7, 8]), settings: S });
  assert.deepEqual([h.action, h.weight], ['hold', 30]);
});

test('정체: 같은 무게 2주 연속 총 반복 제자리 → 10% 낮춘 무게(증가폭 단위)', () => {
  assert.equal(isStalled([{ weight: 60, totalReps: 22 }, { weight: 60, totalReps: 22 }, { weight: 60, totalReps: 21 }]), true);
  assert.equal(isStalled([{ weight: 60, totalReps: 22 }, { weight: 60, totalReps: 23 }, { weight: 60, totalReps: 23 }]), false);
  assert.equal(isStalled([{ weight: 57.5, totalReps: 22 }, { weight: 60, totalReps: 22 }, { weight: 60, totalReps: 22 }]), false);
  const history = [{ weight: 60, totalReps: 21 }, { weight: 60, totalReps: 21 }];
  const r = judgeExercise({ exId: 'bench', ex: X.bench, presc: main, sets: sets(60, [6, 5, 5, 5], 2), settings: S, history });
  assert.deepEqual([r.action, r.weight], ['stall', 55]); // 54 → 2.5 단위 55
  const sq = judgeExercise({ exId: 'backSquat', ex: X.backSquat, presc: main, sets: sets(100, [5, 5, 5, 5], 2), settings: S, history: [{ weight: 100, totalReps: 20 }, { weight: 100, totalReps: 20 }] });
  assert.equal(sq.weight, 90);
});

test('정비 주간·플라이오·네거티브·맨몸·기록 없음', () => {
  assert.equal(judgeExercise({ exId: 'bench', ex: X.bench, presc: { ...main, sets: 2 }, sets: sets(60, [6, 6], 2), settings: S, deload: true }).action, 'hold');
  assert.equal(judgeExercise({ exId: 'jumpSquat', ex: X.jumpSquat, presc: { sets: 3, reps: [5, 5] }, sets: sets(0, [5, 5, 5]), settings: S }).action, 'none');
  assert.equal(judgeExercise({ exId: 'negPullup', ex: X.negPullup, presc: { sets: 3, reps: [3, 3] }, sets: sets(0, [3, 3, 3]), settings: S }).action, 'check');
  assert.equal(judgeExercise({ exId: 'legRaise', ex: X.legRaise, presc: { sets: 3, reps: [10, 15] }, sets: sets(0, [15, 15, 15]), settings: S }).action, 'note');
  assert.equal(judgeExercise({ exId: 'bench', ex: X.bench, presc: main, sets: [], settings: S }).action, 'skip');
});

test('톱세트·네거티브 단계', () => {
  assert.deepEqual(topSet([{ w: 60, reps: 6 }, { w: 62.5, reps: 4 }, { w: 62.5, reps: 5 }]), { w: 62.5, reps: 5 });
  assert.deepEqual(topSet([{ w: 30, reps: 8 }, { w: 25, reps: 6 }], 'assist'), { w: 25, reps: 6 });
  assert.equal(nextNegStage(0, true, 2), 1);
  assert.equal(nextNegStage(2, true, 2), 2);
  assert.equal(nextNegStage(1, false, 2), 1);
});
