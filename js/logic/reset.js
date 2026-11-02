// 운동 초기화: 설정은 그대로 두고 고른 기록만 지운다 (순수 함수)
import { upcomingMonday } from './dates.js';

// 기본 시작일: 아직 시작 전이면 그대로, 이미 시작했으면 다가오는 월요일(1주차부터 다시)
export const resetStartDate = (startDate, today) => (startDate && startDate >= today ? startDate : upcomingMonday(today));

// 지워질 기록 개수(확인 화면용)
export const resetCounts = (state) => ({ sessions: state.sessions.length, tests: state.tests.length });

/**
 * @param {object} state
 * @param {object} opts
 * @param {boolean} opts.gym    헬스 세션·다음 목표 무게·네거티브 단계·진행 중 세션
 * @param {string}  opts.startDate gym과 함께: 새 시작일(1주차)
 * @param {boolean} opts.tests  턱걸이 측정 기록
 */
export function resetWorkout(state, { gym = false, tests = false, startDate = null } = {}) {
  const next = { ...state, settings: { ...state.settings } };
  if (gym) {
    Object.assign(next, { sessions: [], targets: {}, exState: {}, active: null });
    if (startDate) next.settings.startDate = startDate;
  }
  if (tests) next.tests = [];
  return next;
}
