import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickWarnings } from '../js/logic/schedule.js';
import { SESSIONS } from '../data/program.js';

const w = (key, date, sessions) => pickWarnings({ key, date, sessions, defs: SESSIONS });
const s = (key, date, startedAt = 0) => ({ key, date, startedAt });

test('원래 배치(월 상A·화 하A·목 상B·금 하B)는 경고 없음', () => {
  assert.deepEqual(w('UA', '2026-11-02', []), []);
  assert.deepEqual(w('LA', '2026-11-03', [s('UA', '2026-11-02')]), []);
  assert.deepEqual(w('UB', '2026-11-05', [s('UA', '2026-11-02'), s('LA', '2026-11-03')]), []);
  assert.deepEqual(w('LB', '2026-11-06', [s('UA', '2026-11-02'), s('LA', '2026-11-03'), s('UB', '2026-11-05')]), []);
  // 다음 주 월요일 상A: 금 하B 뒤라도 문제 없음
  assert.deepEqual(w('UA', '2026-11-09', [s('UB', '2026-11-05'), s('LB', '2026-11-06')]), []);
});

test('상체끼리·하체끼리 48시간', () => {
  assert.deepEqual(w('UB', '2026-11-03', [s('UA', '2026-11-02')]), ['상체끼리 48시간 안 됨 — 어제 상체A']);
  assert.deepEqual(w('UB', '2026-11-02', [s('UA', '2026-11-02')]), ['상체끼리 48시간 안 됨 — 오늘 상체A']);
  assert.deepEqual(w('UB', '2026-11-04', [s('UA', '2026-11-02')]), []);
  assert.match(w('LB', '2026-11-04', [s('LA', '2026-11-03')])[0], /하체끼리 48시간 안 됨 — 어제 하체A/);
});

test('하체 A·B 연달아(같은 주, 사이에 상체 없음)', () => {
  assert.deepEqual(w('LB', '2026-11-05', [s('UA', '2026-11-02'), s('LA', '2026-11-03')]), ['하체 A·B 연달아 — 바로 전이 하체A, 사이에 상체 세션 넣기']);
  assert.deepEqual(w('LB', '2026-11-05', [s('LA', '2026-11-03'), s('UB', '2026-11-04')]), []);
  // 지난주 하B → 이번 주 화 하A(월 상A 건너뜀): 주가 바뀌면 경고하지 않음
  assert.deepEqual(w('LA', '2026-11-10', [s('LB', '2026-11-06')]), []);
  // 같은 세션 반복은 연달아 규칙 대상 아님(48시간만 확인)
  assert.deepEqual(w('LA', '2026-11-06', [s('LA', '2026-11-03')]), []);
});
