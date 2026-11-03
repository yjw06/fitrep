import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickWarnings } from '../js/logic/schedule.js';
import { SESSIONS } from '../data/program.js';

const w = (key, date, sessions) => pickWarnings({ key, date, sessions, defs: SESSIONS });
const s = (key, date, startedAt = 0) => ({ key, date, startedAt });

test('원래 배치(월 가슴 · 화 등 · 수 어깨 · 목 하체 · 금 팔)는 경고 없음', () => {
  const week = [s('mon', '2026-11-02'), s('tue', '2026-11-03'), s('wed', '2026-11-04'), s('thu', '2026-11-05')];
  assert.deepEqual(w('mon', '2026-11-02', []), []);
  assert.deepEqual(w('wed', '2026-11-04', week.slice(0, 2)), []);
  assert.deepEqual(w('fri', '2026-11-06', week), []);
  assert.deepEqual(w('mon', '2026-11-09', [...week, s('fri', '2026-11-06')]), []); // 금 팔 → 월 가슴(사흘 뒤)
});

test('삼두 쓰는 날(가슴·어깨·팔)을 오늘·어제에 연달아 두면 경고', () => {
  assert.deepEqual(w('wed', '2026-11-03', [s('mon', '2026-11-02')]), ['삼두를 같이 쓰는 날 연달아 — 어제 가슴 + 복근']);
  assert.deepEqual(w('fri', '2026-11-02', [s('mon', '2026-11-02')]), ['삼두를 같이 쓰는 날 연달아 — 오늘 가슴 + 복근']);
  assert.deepEqual(w('mon', '2026-11-07', [s('fri', '2026-11-06')]), ['삼두를 같이 쓰는 날 연달아 — 어제 팔 + 복근']);
  // 사이에 등·하체가 있거나 하루 쉬면 괜찮음
  assert.deepEqual(w('wed', '2026-11-03', [s('mon', '2026-11-02'), s('thu', '2026-11-03')]), []);
  assert.deepEqual(w('wed', '2026-11-04', [s('mon', '2026-11-02')]), []);
  // 등·하체는 언제든
  assert.deepEqual(w('tue', '2026-11-03', [s('mon', '2026-11-02')]), []);
  // 이전 루틴 기록(키가 없는 세션)은 무시
  assert.deepEqual(w('mon', '2026-11-03', [s('UA', '2026-11-02')]), []);
});
