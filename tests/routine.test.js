import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildProgram, validateRoutine } from '../js/logic/routine.js';
import ROUTINE from '../data/routine.js';
import * as P from '../data/program.js';

test('루틴 파일 형식 점검', () => {
  assert.deepEqual(validateRoutine(ROUTINE), []);
  const bad = JSON.parse(JSON.stringify(ROUTINE));
  bad.days[0].blocks[0].exercises[0].category = 'cardio';
  bad.days[1].blocks[0].exercises[0].reps = { min: 5, max: 3 };
  bad.days[2].id = 'mon';
  const p = validateRoutine(bad);
  assert.equal(p.length, 3);
  assert.match(p.join(), /category cardio/);
  assert.deepEqual(validateRoutine({ schemaVersion: 2 }), ['schemaVersion은 1이어야 합니다', 'days가 없습니다']);
});

test('요일 배치·세션: 월 가슴+복근 / 화 등 / 수 어깨 / 목 하체 / 금 팔+복근, 토·일 휴식', () => {
  assert.deepEqual(P.WEEK_PLAN, { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri' });
  assert.deepEqual(P.SESSION_ORDER, ['mon', 'tue', 'wed', 'thu', 'fri']);
  assert.deepEqual(P.SESSION_ORDER.map((k) => P.SESSIONS[k].name), ['가슴 + 복근', '등', '어깨', '하체', '팔 + 복근']);
  assert.deepEqual(P.SESSION_ORDER.map((k) => P.SESSIONS[k].short), ['가슴', '등', '어깨', '하체', '팔']);
  assert.deepEqual(P.SESSION_ORDER.map((k) => P.SESSIONS[k].minutes), [55, 58, 50, 49, 54]);
  assert.deepEqual(P.SESSION_ORDER.map((k) => P.SESSIONS[k].triceps), [true, false, true, false, true]);
  assert.equal(P.SESSIONS.thu.warmup, 'lower');
});

test('블록 → 슬롯: 슈퍼세트·휴식·턱걸이 슬롯·대체 종목', () => {
  const mon = P.SESSIONS.mon;
  assert.deepEqual(mon.slots.map((s) => [s.id, s.items.length, s.rest[0]]), [['mon1', 1, 150], ['mon2', 1, 120], ['mon3', 1, 120], ['mon4', 2, 60], ['mon5', 1, 45]]);
  assert.deepEqual(mon.slots[0].items[0], {
    ex: 'bench_press', sets: 4, reps: [5, 6], rir: [2, 2], note: '견갑을 모으고 내린 채 고정, 바는 유두선 아래로', alts: ['smith_bench_press'],
  });
  assert.equal(mon.slots[3].items[0].rirLastOnly, true); // 고립: 마지막 세트에만 RIR 0~1
  assert.equal(mon.slots[2].items[0].alts[0].ex, 'high_to_low_cable_fly');
  assert.equal(P.SESSIONS.tue.slots[0].pullupSlot, 'tue');
  assert.equal(P.SESSIONS.fri.slots[0].pullupSlot, 'fri');
  assert.equal(P.SESSIONS.mon.slots[0].pullupSlot, undefined);
  assert.equal(P.SESSIONS.fri.slots[5].items[1].perSide, true); // 팔로프 좌우
});

test('종목: 종류·시작 무게·증가폭·부위', () => {
  const E = P.EXERCISES;
  assert.deepEqual([E.bench_press.kind, E.bench_press.start, E.bench_press.incKg, E.bench_press.warmup], ['main', 40, 2.5, true]);
  assert.deepEqual([E.deadlift.region, E.deadlift.incKg, E.back_squat.region], ['lower', 5, 'lower']);
  assert.deepEqual([E.assisted_pullup.kind, E.assisted_pullup.start, E.assisted_pullup.incKg], ['assist', 30, 5]); // 20~30 중 보조 많은 쪽
  assert.deepEqual([E.db_shoulder_press.perHand, E.db_shoulder_press.start, E.db_shoulder_press.incStep], [true, 10, 'dumbbell']);
  assert.deepEqual([E.pec_deck_fly.kind, E.pec_deck_fly.incStep, E.pec_deck_fly.start], ['isolation', 'machine', undefined]);
  assert.equal(E.negative_pullup.kind, 'negative');
  assert.equal(E.ez_bar_curl.equip, 'barbell');
  assert.equal(E.cable_crunch.name, '케이블 크런치 (로프, 무릎 꿇고)'); // 월·금 공용
  assert.equal(E.wide_lat_pulldown.target, '광배근');
  assert.match(E.close_grip_bench.intensity.cue, /자세는 그대로/);
  // 보충 종목은 루틴 종목을 덮지 않음
  const prog = buildProgram(ROUTINE, { exercises: { bench_press: { name: 'X' } } });
  assert.equal(prog.EXERCISES.bench_press.name, '바벨 벤치프레스');
});
