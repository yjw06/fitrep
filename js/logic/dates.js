// 날짜 유틸 — 시간대 Asia/Seoul, 주 시작 월요일.
// 날짜 문자열은 'YYYY-MM-DD'(서울 기준 달력 날짜). 날짜 계산은 UTC 자정 기준으로 한다.

const TZ = 'Asia/Seoul';
const DAY = 86400000;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DOW_KO = ['', '월', '화', '수', '목', '금', '토', '일'];

const fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

const pad = (n, w = 2) => String(n).padStart(w, '0');

export function seoulParts(ms = Date.now()) {
  const p = {};
  for (const { type, value } of fmt.formatToParts(new Date(ms))) p[type] = value;
  const y = +p.year, m = +p.month, d = +p.day;
  return { y, m, d, hh: +p.hour, mm: +p.minute, ss: +p.second, dow: dowOf(`${y}-${pad(m)}-${pad(d)}`) };
}

export function todayStr(ms = Date.now()) {
  const { y, m, d } = seoulParts(ms);
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function formatDate(utcMs) {
  const dt = new Date(utcMs);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export const isDateStr = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseDate(s));
export const addDays = (str, n) => formatDate(parseDate(str) + n * DAY);
export const diffDays = (a, b) => Math.round((parseDate(b) - parseDate(a)) / DAY);

// 1=월 … 7=일
export function dowOf(str) {
  const js = new Date(parseDate(str)).getUTCDay();
  return js === 0 ? 7 : js;
}
export const dowKo = (dow) => DOW_KO[dow];

export const mondayOf = (str) => addDays(str, 1 - dowOf(str));

// 다가오는 월요일(오늘이 월요일이면 오늘)
export function upcomingMonday(str) {
  const dow = dowOf(str);
  return dow === 1 ? str : addDays(str, 8 - dow);
}

// 시작일 기준 주차(시작 주 = 1). 시작 전이면 0 이하.
export function weekNumber(startStr, dateStr) {
  return Math.floor(diffDays(mondayOf(startStr), dateStr) / 7) + 1;
}

export const isDeloadWeek = (week, every) => every > 0 && week > 0 && week % every === 0;

// 군대식 DTG: DDHHMM + 시간대 문자(I=UTC+9) + 월 + 연도 2자리. 예) 311317I OCT 26
export function dtg(ms = Date.now()) {
  const { y, m, d, hh, mm } = seoulParts(ms);
  return `${pad(d)}${pad(hh)}${pad(mm)}I ${MONTHS[m - 1]} ${pad(y % 100)}`;
}

export function fmtClock(sec) {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

// 'm:ss' → 초. 실패 시 null
export function parseClock(str) {
  const m = /^\s*(\d{1,3}):([0-5]\d)\s*$/.exec(str ?? '');
  return m ? +m[1] * 60 + +m[2] : null;
}

export function seoulTimeStr(ms) {
  const { hh, mm } = seoulParts(ms);
  return `${pad(hh)}:${pad(mm)}`;
}

export function shortDate(str) {
  const [, m, d] = str.split('-').map(Number);
  return `${m}/${d}(${dowKo(dowOf(str))})`;
}
