// 요일을 바꿀 땐 삼두를 같이 쓰는 가슴·어깨·팔(SESSIONS[].triceps)을 연달아 두지 않는다 (순수 함수)
import { diffDays } from './dates.js';

const byTime = (a, b) => (a.date === b.date ? (a.startedAt ?? 0) - (b.startedAt ?? 0) : a.date < b.date ? -1 : 1);
const ago = (d) => (d === 0 ? '오늘' : '어제');

/**
 * date에 key 세션을 하면 어기는 규칙(완료한 세션 기준). 없으면 []
 * 바로 전 세션이 오늘·어제 한 삼두 쓰는 날이면 경고
 * @param {{ key, date, sessions, defs }} p  defs = SESSIONS
 */
export function pickWarnings({ key, date, sessions, defs }) {
  if (!defs[key]?.triceps) return [];
  const last = sessions.filter((s) => s.date <= date && defs[s.key]).sort(byTime).at(-1);
  if (!last || !defs[last.key].triceps) return [];
  const d = diffDays(last.date, date);
  if (d > 1) return [];
  return [`삼두를 같이 쓰는 날 연달아 — ${ago(d)} ${defs[last.key].name}`];
}
