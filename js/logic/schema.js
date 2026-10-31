// 저장 스키마 + 마이그레이션 (순수 함수). store.js가 localStorage 입출력을 맡는다.
// 2단계 필드(bodyweight, protein, intervals, reschedule 등)도 미리 자리를 잡아 둔다.

export const SCHEMA_VERSION = 2;
export const APP_ID = 'fitrep';

export function defaultSettings() {
  return {
    callsign: '',
    startDate: null,            // 'YYYY-MM-DD'(월요일)
    theme: 'dark',              // dark | light
    sound: true,
    voice: true,
    deloadEvery: 5,             // 5·10·15…주차 정비 주간
    bar: 20,
    plates: [20, 15, 10, 5, 2.5, 1.25],
    inc: { mainUpper: 2.5, mainLower: 5, barbell: 2.5, smith: 2.5, dumbbell: 2, machine: 5, cable: 5, assist: 5 },
    incOverride: {},            // { exId: kg } 종목별 증가폭
    goals: { pullups: 10, pushups: null, situps: null, run3kSec: 750 },
    shortcut: { enabled: false, name: '시계 타이머 시작' },
    alts: {},                   // { slotId: exId } 마지막으로 고른 대체 종목
    // 2단계
    testAnchorDate: null,       // 체력 검정 기준일(일요일). null이면 시작 주 일요일
    gymDays: [1, 2, 3, 4, 5, 6],
    proteinTarget: [120, 150],
    proteinPresets: [{ name: '닭가슴살 200g', g: 45 }, { name: 'WPI 1.5스쿱', g: 31.5 }],
  };
}

export function defaultState() {
  return {
    schema: SCHEMA_VERSION,
    setupDone: false,
    settings: defaultSettings(),
    tests: [],        // [{ id, date, pullups, pushups, situps, run3kSec?, mode:'manual'|'timed' }]
    sessions: [],     // 완료 세션 [{ id, key, date, week, deload, startedAt, endedAt, entries:[{ slotId, ex, presc, sets:[{w,reps,rir}] }], results }]
    active: null,     // 진행 중 세션(복원용)
    targets: {},      // { exId: { weight, reason, date } } 다음 세션 목표
    exState: {},      // { negPullup: { stage } }
    missions: {},     // { 'YYYY-MM-DD': { done: true, at } }
    // 2단계
    bodyweight: [],   // [{ date, kg }]
    protein: {},      // { 'YYYY-MM-DD': [{ name, g, at }] }
    intervals: [],    // [{ date, laps:[sec] }]
    reschedule: {},   // { mondayStr: { passes:[{ date, key, reason, at }], applied:{ from, assign:{date:key}, skip:[key] }|null } }
    skillLogs: [],    // [{ date, rank, sets:[{ label, reps?, sec? }] }]
    drill: null,      // 진행 중 드릴(pttest|interval|skill) — 시각 저장으로 복원
  };
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

function deepFill(base, src) {
  if (!isObj(src)) return base;
  const out = { ...base };
  for (const k of Object.keys(src)) {
    out[k] = isObj(base[k]) && isObj(src[k]) ? deepFill(base[k], src[k]) : src[k];
  }
  return out;
}

// 버전별 마이그레이션: MIGRATIONS[n]은 schema n → n+1
const MIGRATIONS = {
  // v1 → v2: 2단계(턱걸이 목표, 스킬 기록, 드릴 상태, 재편성 구조)
  1: (s) => {
    const resched = {};
    for (const [mon, r] of Object.entries(s.reschedule ?? {})) {
      resched[mon] = { passes: r?.passes ?? [], applied: r?.applied ?? null };
    }
    return {
      ...s,
      settings: { ...s.settings, goals: { pullups: 10, ...(s.settings?.goals ?? {}) } },
      reschedule: resched,
      skillLogs: Array.isArray(s.skillLogs) ? s.skillLogs : [],
      drill: null,
    };
  },
};

export function migrate(raw) {
  if (!isObj(raw)) return defaultState();
  let s = { ...raw };
  let v = Number.isInteger(s.schema) ? s.schema : 0;
  if (v > SCHEMA_VERSION) throw new Error(`더 새로운 버전(${v})의 데이터입니다. 앱을 업데이트하세요.`);
  while (v < SCHEMA_VERSION) {
    const step = MIGRATIONS[v];
    if (step) s = step(s);
    v += 1;
    s.schema = v;
  }
  const def = defaultState();
  const out = deepFill(def, s);
  for (const k of ['tests', 'sessions', 'bodyweight', 'intervals', 'skillLogs']) if (!Array.isArray(out[k])) out[k] = [];
  out.schema = SCHEMA_VERSION;
  return out;
}

export function makeBackup(state, now = Date.now()) {
  return { app: APP_ID, exportedAt: new Date(now).toISOString(), schema: SCHEMA_VERSION, data: state };
}

// 백업 JSON(문자열/객체) → 마이그레이션된 상태. 형식이 틀리면 throw
export function readBackup(input) {
  const obj = typeof input === 'string' ? JSON.parse(input) : input;
  if (!isObj(obj) || obj.app !== APP_ID || !isObj(obj.data)) throw new Error('FITREP 백업 파일이 아닙니다.');
  return migrate(obj.data);
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
