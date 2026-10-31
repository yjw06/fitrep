// 운동 초기화: 설정은 그대로 두고 고른 기록만 지운다 (순수 함수)
import { upcomingMonday } from './dates.js';

// 기본 시작일: 아직 시작 전이면 그대로, 이미 시작했으면 다가오는 월요일(1주차부터 다시)
export const resetStartDate = (startDate, today) => (startDate && startDate >= today ? startDate : upcomingMonday(today));

// 지워질 기록 개수(확인 화면용)
export function resetCounts(state) {
  return {
    sessions: state.sessions.length,
    missions: Object.keys(state.missions).length,
    skillLogs: state.skillLogs.length,
    intervals: state.intervals.length,
    tests: state.tests.length,
  };
}

/**
 * @param {object} state
 * @param {object} opts
 * @param {boolean} opts.gym    헬스 세션·다음 목표 무게·네거티브 단계·작전 재편성·진행 중 세션
 * @param {string}  opts.startDate gym과 함께: 새 시작일(1주차)
 * @param {boolean} opts.pt     체력단련 결과·스킬·인터벌 기록·진행 중 스킬/인터벌
 * @param {boolean} opts.tests  체력 검정 기록·진행 중 2분 모드
 */
export function resetWorkout(state, { gym = false, pt = false, tests = false, startDate = null } = {}) {
  const next = { ...state, settings: { ...state.settings } };
  if (gym) {
    Object.assign(next, { sessions: [], targets: {}, exState: {}, reschedule: {}, active: null });
    if (startDate) next.settings.startDate = startDate;
  }
  if (pt) Object.assign(next, { missions: {}, skillLogs: [], intervals: [] });
  if (tests) next.tests = [];
  const drill = state.drill?.type;
  if ((pt && (drill === 'skill' || drill === 'interval')) || (tests && drill === 'pttest')) next.drill = null;
  return next;
}
