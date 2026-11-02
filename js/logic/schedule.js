// 요일은 바꿔도 되지만 상체끼리·하체끼리 48시간 이상 띄우고, 하체 A·B는 연달아 두지 않는다 (순수 함수)
import { diffDays, mondayOf } from './dates.js';

const byTime = (a, b) => (a.date === b.date ? (a.startedAt ?? 0) - (b.startedAt ?? 0) : a.date < b.date ? -1 : 1);
const ago = (d) => (d === 0 ? '오늘' : d === 1 ? '어제' : `${d}일 전`);
const LOWER = ['LA', 'LB'];

/**
 * date에 key 세션을 하면 어기는 규칙(완료한 세션 기준). 없으면 []
 * @param {{ key, date, sessions, defs }} p  defs = SESSIONS
 */
export function pickWarnings({ key, date, sessions, defs }) {
  const past = sessions.filter((s) => s.date <= date && defs[s.key]).sort(byTime);
  const out = [];
  const region = defs[key].region;
  const same = past.filter((s) => defs[s.key].region === region).at(-1);
  if (same && diffDays(same.date, date) < 2) {
    out.push(`${region === 'upper' ? '상체' : '하체'}끼리 48시간 안 됨 — ${ago(diffDays(same.date, date))} ${defs[same.key].name}`);
  }
  const last = past.at(-1);
  if (last && LOWER.includes(key) && LOWER.includes(last.key) && last.key !== key && last.date >= mondayOf(date)) {
    out.push(`하체 A·B 연달아 — 바로 전이 ${defs[last.key].name}, 사이에 상체 세션 넣기`);
  }
  return out;
}
