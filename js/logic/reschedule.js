// 작전 재편성: 패스한 뒤 남은 요일에 남은 세션 재배치안 (순수 함수)
// 규칙: 하루 1세션, 같은 부위(상체끼리·하체끼리) 48시간(2일) 이상, 하체A·B 연달아 금지(사이에 다른 세션 필요),
//       헬스장 가능 요일 안. 원래 일정과 차이(일수 합) 적은 순. 다 못 넣으면 생략할 세션 제안.
import { addDays, diffDays, dowOf } from './dates.js';

const LOWER_PAIR = new Set(['LA', 'LB']);

// 날짜순 세션 목록이 규칙을 지키는지
export function isValidSchedule(list, sessions) {
  const s = [...list].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && s[i].date === s[i - 1].date) return false;
    for (let j = i + 1; j < s.length; j++) {
      if (sessions[s[i].key].region === sessions[s[j].key].region && diffDays(s[i].date, s[j].date) < 2) return false;
    }
    if (i > 0 && LOWER_PAIR.has(s[i].key) && LOWER_PAIR.has(s[i - 1].key) && s[i].key !== s[i - 1].key) return false;
  }
  return true;
}

function combos(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [h, ...t] = arr;
  return [...combos(t, k - 1).map((c) => [h, ...c]), ...combos(t, k)];
}

/**
 * @param {object} p
 * @param {string} p.from      재배치 시작일(이 날 포함 여부는 includeFrom)
 * @param {boolean} p.includeFrom
 * @param {Array}  p.done      이번 주 이미 한 세션 [{ key, date }]
 * @param {string[]} p.remaining 배치할 세션 키
 * @param {number[]} p.gymDays  헬스장 가능 요일(1=월…7=일)
 * @param {object} p.sessions  SESSIONS
 * @param {string[]} p.blocked 배치 불가 날짜(패스한 날 등)
 * @returns [{ assign:{date:key}, skip:[key], cost }] 최대 max개
 */
export function proposals({ from, includeFrom = false, done = [], remaining, gymDays, sessions, blocked = [], max = 3 }) {
  const monday = addDays(from, 1 - dowOf(from));
  const doneDates = new Set(done.map((d) => d.date));
  const days = [];
  for (let d = includeFrom ? from : addDays(from, 1); d <= addDays(monday, 6); d = addDays(d, 1)) {
    if (gymDays.includes(dowOf(d)) && !doneDates.has(d) && !blocked.includes(d)) days.push(d);
  }
  const original = (key) => addDays(monday, sessions[key].dow - 1);

  for (let k = remaining.length; k >= 0; k--) {
    const found = [];
    for (const subset of combos(remaining, k)) {
      const assign = (i, used, acc, cost) => {
        if (i === subset.length) {
          if (isValidSchedule([...done, ...acc], sessions)) found.push({ acc, cost });
          return;
        }
        for (const d of days) {
          if (used.has(d)) continue;
          used.add(d);
          assign(i + 1, used, [...acc, { key: subset[i], date: d }], cost + Math.abs(diffDays(original(subset[i]), d)));
          used.delete(d);
        }
      };
      assign(0, new Set(), [], 0);
    }
    if (found.length) {
      found.sort((a, b) => a.cost - b.cost || a.acc.map((x) => x.date).sort().join().localeCompare(b.acc.map((x) => x.date).sort().join()));
      const seen = new Set();
      const out = [];
      for (const f of found) {
        const assign = Object.fromEntries([...f.acc].sort((a, b) => (a.date < b.date ? -1 : 1)).map((x) => [x.date, x.key]));
        const sig = JSON.stringify(assign);
        if (seen.has(sig)) continue;
        seen.add(sig);
        out.push({ assign, skip: remaining.filter((r) => !f.acc.some((x) => x.key === r)), cost: f.cost });
        if (out.length >= max) break;
      }
      return out;
    }
  }
  return [];
}

// 한 주(월~일) 날짜 → 세션 키. 적용된 재편성이 있으면 from 이후는 그 배치로.
export function weekSchedule(monday, weekPlan, resched) {
  const out = {};
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    out[d] = weekPlan[i + 1] ?? null;
  }
  const ap = resched?.applied;
  if (ap) {
    for (const d of Object.keys(out)) if (d >= ap.from) out[d] = ap.assign[d] ?? null;
  }
  return out;
}
