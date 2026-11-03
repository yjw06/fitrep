import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stageIndex, stageInfo, roadmapItem } from '../js/logic/roadmap.js';
import { buildPlan, buildSteps } from '../js/logic/plan.js';
import * as P from '../data/program.js';

const S = P.PULLUP_STAGES;
const ctx = (extra = {}) => ({ week: 2, deloadEvery: 5, negStage: 0, negStages: P.NEGATIVE_STAGES, alts: {}, exercises: P.EXERCISES, ...extra });

test('단계 판정: 1~2개 → 1, 3~5 → 2, 6~9 → 3, 10+ → 4 (0개·미측정도 1단계)', () => {
  assert.deepEqual([0, 1, 2, 3, 5, 6, 9, 10, 15, null].map((n) => S[stageIndex(n, S)].stage), [1, 1, 1, 2, 2, 3, 3, 4, 4, 1]);
  const i = stageInfo(4, S);
  assert.deepEqual([i.next.stage, i.toNext], [3, 2]);
  assert.equal(stageInfo(12, S).next, null);
});

test('단계별 화·금 1번 처방', () => {
  const a2 = roadmapItem(S[1], 'tue', 4), b2 = roadmapItem(S[1], 'fri', 4);
  assert.deepEqual([a2.ex, a2.sets, a2.reps, a2.rest], ['cluster_pullup', 6, [1, 2], 45]);
  assert.deepEqual([b2.ex, b2.sets, b2.reps], ['cluster_chinup', 5, [1, 2]]);
  assert.deepEqual(roadmapItem(S[2], 'tue', 8).reps, [6, 6]); // 2개 남기고
  assert.deepEqual([roadmapItem(S[2], 'fri', 6).ex, roadmapItem(S[2], 'fri', 6).sets, roadmapItem(S[2], 'fri', 6).reps], ['strict_chinup', 3, [4, 4]]);
  assert.deepEqual([roadmapItem(S[3], 'tue', 12).ex, roadmapItem(S[3], 'tue', 12).reps], ['weighted_pullup', [5, 5]]);
  assert.deepEqual([roadmapItem(S[3], 'fri', 12).ex, roadmapItem(S[3], 'fri', 12).sets, roadmapItem(S[3], 'fri', 12).reps], ['weighted_chinup', 3, [6, 6]]);
});

test('buildPlan: 1단계는 루틴 처방 그대로, 2단계부터 화·금 1번 교체(휴식 포함)', () => {
  const tue1 = buildPlan(P.SESSIONS.tue, ctx({ pullup: { stage: S[0], max: 1 } }));
  assert.equal(tue1.entries[0].ex, 'negative_pullup');
  assert.match(tue1.entries[0].presc.note, /내려오는 힘/); // 루틴 파일 cue
  const fri1 = buildPlan(P.SESSIONS.fri, ctx({ pullup: { stage: S[0], max: 1 } }));
  assert.deepEqual([fri1.entries[0].ex, fri1.entries[0].presc.rir], ['assisted_chinup', [1, 2]]);

  const tue2 = buildPlan(P.SESSIONS.tue, ctx({ pullup: { stage: S[1], max: 3 } }));
  assert.deepEqual([tue2.entries[0].ex, tue2.slots[0].rest], ['cluster_pullup', 45]);
  assert.equal(buildSteps(tue2).filter((s) => s.slotId === 'tue1').length, 6);
  const fri2 = buildPlan(P.SESSIONS.fri, ctx({ pullup: { stage: S[1], max: 3 } }));
  assert.equal(fri2.entries[0].ex, 'cluster_chinup');
  assert.equal(buildSteps(fri2).filter((s) => s.slotId === 'fri1').length, 5);

  const tue4 = buildPlan(P.SESSIONS.tue, ctx({ week: 5, pullup: { stage: S[3], max: 10 } }));
  assert.equal(tue4.entries[0].presc.sets, 2); // 정비 주간 절반
  assert.equal(buildPlan(P.SESSIONS.mon, ctx({ pullup: { stage: S[3], max: 10 } })).entries[0].ex, 'bench_press');
});
