// 체력단련 미션 계산 (순수 함수)
// 체력단련 중엔 폰을 못 쓴다 → 전날 저녁 브리핑 + 끝난 뒤 결과 기록(완료/일부/못함) 방식
import { skillPlan, skillDose } from './rank.js';
import { isTestDay } from './pttest.js';
import { addDays, dowOf } from './dates.js';
export { isTestDay };

// 항목별 최신 검정 값(날짜 내림차순으로 첫 non-null)
export function latestTestValues(tests) {
  const sorted = [...tests].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const pick = (k) => sorted.find((t) => t[k] != null && t[k] !== '')?.[k] ?? null;
  return { pullups: pick('pullups'), pushups: pick('pushups'), situps: pick('situps'), run3kSec: pick('run3kSec') };
}

export const sixty = (max, ratio = 0.6) => (max > 0 ? Math.max(1, Math.round(max * ratio)) : null);

// 400m 목표 페이스(초) = 목표 3km ÷ 7.5
export const intervalPace = (goalSec, divisor = 7.5) => (goalSec > 0 ? Math.round(goalSec / divisor) : null);

// 결과 기록: done=완료, partial=일부, skip=못함
export const MISSION_STATUS = ['done', 'partial', 'skip'];

const SHORT = { situp: '윗몸', pushup: '팔굽', skill: '스킬', interval: '인터벌', run: '달리기', rest: '휴식', test: '검정' };
const RECORDABLE = new Set(['situp', 'pushup', 'skill', 'interval']);

// 결과를 기록할 미션이 있는 요일인지(선택 항목만 있는 날·달리기만·휴식은 제외)
export const isRecordable = (dow, program) => (program.CALISTHENICS[dow] ?? []).some((m) => RECORDABLE.has(m.type) && !m.optional);

// 주간 칸에 쓸 짧은 이름(선택 항목 제외). 일요일은 검정일이면 '검정', 아니면 '휴식'
export function missionShort(dow, program, testDay = false) {
  const items = (program.CALISTHENICS[dow] ?? []).filter((m) => !m.optional);
  if (items.some((m) => m.type === 'test')) return testDay ? SHORT.test : SHORT.rest;
  return items.map((m) => SHORT[m.type] ?? m.type).join('+');
}

/**
 * 이번 주(월~일) 체력단련 결과
 * @returns {{ days:[{ date, dow, label, recordable, status, future }], done, partial, skip, required }}
 */
export function weekMissions({ monday, today, missions, program, anchor = null }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const dow = dowOf(date);
    return {
      date, dow,
      label: missionShort(dow, program, isTestDay(date, anchor)),
      recordable: isRecordable(dow, program),
      status: missions[date]?.status ?? null,
      future: date > today,
    };
  });
  const req = days.filter((d) => d.recordable);
  const count = (s) => req.filter((d) => d.status === s).length;
  return { days, done: count('done'), partial: count('partial'), skip: count('skip'), required: req.length };
}

/**
 * 요일별 미션 카드 데이터
 * @returns [{ type, title, sets?, reps?, rest?, optional?, pace?, steps?, missing? }]
 */
// rankIdx: 턱걸이 계급(스킬 데이 계획), testDay: 격주 검정일 여부(null이면 '격주' 문구로 항상 표시)
export function missionsFor(dow, { tests, goals, program, rankIdx = 0, testDay = null }) {
  const latest = latestTestValues(tests);
  const { CALISTHENICS, MISSION_RULES, SKILL_STEPS, SKILL_MINUTES, INTERVAL } = program;
  return (CALISTHENICS[dow] ?? []).filter((m) => !(m.type === 'test' && testDay === false)).map((m) => {
    switch (m.type) {
      case 'situp':
      case 'pushup': {
        const rule = MISSION_RULES[m.type];
        const max = m.type === 'situp' ? latest.situps : latest.pushups;
        return { type: m.type, title: rule.label, sets: rule.sets, reps: sixty(max, rule.ratio), rest: rule.rest, max, missing: max == null };
      }
      case 'skill':
        return {
          type: 'skill', title: `턱걸이 스킬 ${SKILL_MINUTES}분`, sub: `실패 전에 멈춤 · ${program.PULLUP_RANKS[rankIdx].name} 계획`,
          steps: program.SKILL_PLANS ? skillPlan(rankIdx, program).map((s) => ({ name: s.name, dose: skillDose(s), cue: s.cue })) : SKILL_STEPS,
        };
      case 'interval':
        return { type: 'interval', title: `400m 인터벌 × ${INTERVAL.reps}`, optional: !!m.optional, pace: intervalPace(goals.run3kSec, INTERVAL.divisor), walk: INTERVAL.walkSec };
      case 'run':
        return { type: 'run', title: '달리기만', sub: '추가 미션 없음' };
      case 'rest':
        return { type: 'rest', title: '완전 휴식' };
      case 'test':
        return { type: 'test', title: testDay ? '체력 검정일' : '(격주) 체력 검정', sub: '정자세 턱걸이 최대 · 팔굽 2분 · 윗몸 2분', due: !!testDay };
      default:
        return { type: m.type, title: m.type };
    }
  });
}
