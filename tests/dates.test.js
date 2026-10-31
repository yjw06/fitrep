import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/logic/dates.js';

test('서울 시간 기준 날짜/DTG', () => {
  // 2026-10-31 04:17 UTC = 13:17 KST
  const ms = Date.UTC(2026, 9, 31, 4, 17);
  assert.equal(D.todayStr(ms), '2026-10-31');
  assert.equal(D.dtg(ms), '311317I OCT 26');
  // UTC 15:30 → 서울은 다음 날 00:30
  assert.equal(D.todayStr(Date.UTC(2026, 11, 31, 15, 30)), '2027-01-01');
  assert.equal(D.dtg(Date.UTC(2026, 11, 31, 15, 30)), '010030I JAN 27');
});

test('요일·월요일·다가오는 월요일', () => {
  assert.equal(D.dowOf('2026-10-31'), 6); // 토
  assert.equal(D.dowOf('2026-11-01'), 7); // 일
  assert.equal(D.mondayOf('2026-11-01'), '2026-10-26');
  assert.equal(D.upcomingMonday('2026-10-31'), '2026-11-02');
  assert.equal(D.upcomingMonday('2026-11-02'), '2026-11-02');
  assert.equal(D.upcomingMonday('2026-11-03'), '2026-11-09');
});

test('주차·정비 주간', () => {
  assert.equal(D.weekNumber('2026-11-02', '2026-11-02'), 1);
  assert.equal(D.weekNumber('2026-11-02', '2026-11-08'), 1);
  assert.equal(D.weekNumber('2026-11-02', '2026-11-09'), 2);
  assert.equal(D.weekNumber('2026-11-02', '2026-10-31'), 0);
  assert.equal(D.isDeloadWeek(5, 5), true);
  assert.equal(D.isDeloadWeek(10, 5), true);
  assert.equal(D.isDeloadWeek(4, 5), false);
  assert.equal(D.isDeloadWeek(0, 5), false);
  assert.equal(D.isDeloadWeek(6, 6), true);
});

test('시계 포맷/파싱', () => {
  assert.equal(D.fmtClock(750), '12:30');
  assert.equal(D.fmtClock(3725), '1:02:05');
  assert.equal(D.parseClock('12:30'), 750);
  assert.equal(D.parseClock('12:75'), null);
  assert.equal(D.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(D.diffDays('2026-11-02', '2026-11-16'), 14);
});
