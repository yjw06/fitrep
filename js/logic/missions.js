// 체력단련 미션 계산 (순수 함수)
import { diffDays } from './dates.js';

// 항목별 최신 검정 값(날짜 내림차순으로 첫 non-null)
export function latestTestValues(tests) {
  const sorted = [...tests].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const pick = (k) => sorted.find((t) => t[k] != null && t[k] !== '')?.[k] ?? null;
  return { pullups: pick('pullups'), pushups: pick('pushups'), situps: pick('situps'), run3kSec: pick('run3kSec') };
}

export const sixty = (max, ratio = 0.6) => (max > 0 ? Math.max(1, Math.round(max * ratio)) : null);

// 400m 목표 페이스(초) = 목표 3km ÷ 7.5
export const intervalPace = (goalSec, divisor = 7.5) => (goalSec > 0 ? Math.round(goalSec / divisor) : null);

// 격주 일요일(기준일부터 14일 간격) — 2단계에서 사용
export function isTestDay(dateStr, anchor) {
  if (!anchor) return false;
  const d = diffDays(anchor, dateStr);
  return d >= 0 && d % 14 === 0;
}

/**
 * 요일별 미션 카드 데이터
 * @returns [{ type, title, sets?, reps?, rest?, optional?, pace?, steps?, missing? }]
 */
export function missionsFor(dow, { tests, goals, program }) {
  const latest = latestTestValues(tests);
  const { CALISTHENICS, MISSION_RULES, SKILL_STEPS, SKILL_MINUTES, INTERVAL } = program;
  return (CALISTHENICS[dow] ?? []).map((m) => {
    switch (m.type) {
      case 'situp':
      case 'pushup': {
        const rule = MISSION_RULES[m.type];
        const max = m.type === 'situp' ? latest.situps : latest.pushups;
        return { type: m.type, title: rule.label, sets: rule.sets, reps: sixty(max, rule.ratio), rest: rule.rest, max, missing: max == null };
      }
      case 'skill':
        return { type: 'skill', title: `턱걸이 스킬 ${SKILL_MINUTES}분`, steps: SKILL_STEPS, sub: '실패 전에 멈춤' };
      case 'interval':
        return { type: 'interval', title: `400m 인터벌 × ${INTERVAL.reps}`, optional: !!m.optional, pace: intervalPace(goals.run3kSec, INTERVAL.divisor), walk: INTERVAL.walkSec };
      case 'run':
        return { type: 'run', title: '달리기만', sub: '추가 미션 없음' };
      case 'rest':
        return { type: 'rest', title: '완전 휴식' };
      case 'test':
        return { type: 'test', title: '(격주) 체력 검정', sub: '정자세 턱걸이 최대 · 팔굽 2분 · 윗몸 2분' };
      default:
        return { type: m.type, title: m.type };
    }
  });
}
