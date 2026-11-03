// 저장 스키마 + 마이그레이션 (순수 함수). store.js가 localStorage 입출력을 맡는다.

export const SCHEMA_VERSION = 6;
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
    inc: { machine: 5, dumbbell: 2, assist: 5 }, // 루틴의 '머신·케이블 한 칸'·'덤벨 한 단계'·어시스트 한 칸
    incOverride: {},            // { exId: kg } 종목별 증가폭(루틴 파일 값보다 우선)
    alts: {},                   // { 'slotId.itemIdx': exId } 마지막으로 고른 대체 종목
    testAnchorDate: null,       // 격주 턱걸이 측정 기준일(일요일). null이면 시작 주 일요일
  };
}

export function defaultState() {
  return {
    schema: SCHEMA_VERSION,
    setupDone: false,
    settings: defaultSettings(),
    tests: [],        // [{ id, date, pullups, pushups?, situps? }] 격주 측정
    sessions: [],     // 완료 세션 [{ id, key, date, week, deload, startedAt, endedAt, entries:[{ slotId, ex, presc, sets:[{w,reps,rir}] }], results }]
    active: null,     // 진행 중 세션(복원용)
    targets: {},      // { exId: { weight, reason, date } } 다음 세션 목표
    exState: {},      // { negPullup: { stage } }
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
  // v2 → v3: 체중·단백질 기능 삭제(짬밥 식사라 정확한 계체·단백질 계산 불가) → 관련 저장값 제거
  2: (s) => {
    const { bodyweight, protein, ...rest } = s;
    const { proteinTarget, proteinPresets, ...settings } = s.settings ?? {};
    return { ...rest, settings };
  },
  // v3 → v4: 체력단련 미션 완료 체크 → 결과 기록(완료/일부/못함)
  3: (s) => {
    const missions = {};
    for (const [date, m] of Object.entries(s.missions ?? {})) {
      const status = m?.status ?? (m?.done ? 'done' : null);
      if (status) missions[date] = { status, at: m?.at ?? null };
    }
    return { ...s, missions };
  },
  // v4 → v5: 새 루틴(체력단련은 몸풀기 — 앱에서 안 다룸) + 쓸모없는 기능 정리
  //   체력단련 미션·스킬·인터벌·2분 모드 드릴·작전 재편성·목표·단축어·헬스장 요일 제거.
  //   슬롯 구성이 바뀌어 기억해 둔 대체 종목 선택(alts)도 비운다.
  4: (s) => {
    const { missions, skillLogs, intervals, drill, reschedule, ...rest } = s;
    const { goals, shortcut, gymDays, ...settings } = s.settings ?? {};
    return { ...rest, settings: { ...settings, alts: {} } };
  },
  // v5 → v6: 주 5회 부위별 루틴(JSON). 종목 id를 루틴 파일 id로 바꿔 기록·다음 목표·네거티브 단계를 이어가고,
  //   증가폭은 종목별 값(루틴 파일)이 기본이 되어 장비 기본값은 머신·덤벨·어시스트만 남긴다.
  5: (s) => {
    const id = (x) => RENAMED[x] ?? x;
    const keys = (o) => Object.fromEntries(Object.entries(o ?? {}).map(([k, v]) => [id(k), v]));
    const sessions = (s.sessions ?? []).map((ss) => ({
      ...ss,
      entries: (ss.entries ?? []).map((e) => ({ ...e, ex: id(e.ex) })),
      results: (ss.results ?? []).map((r) => ({ ...r, exId: id(r.exId) })),
    }));
    const active = s.active?.plan ? {
      ...s.active,
      plan: { ...s.active.plan, entries: s.active.plan.entries.map((e) => ({ ...e, ex: id(e.ex), options: (e.options ?? []).map(id), ...(e.prescs ? { prescs: keys(e.prescs) } : {}) })) },
    } : s.active;
    const inc = s.settings?.inc ?? {};
    return {
      ...s, sessions, active, targets: keys(s.targets), exState: keys(s.exState),
      settings: { ...s.settings, incOverride: keys(s.settings?.incOverride), inc: { machine: inc.machine ?? 5, dumbbell: inc.dumbbell ?? 2, assist: inc.assist ?? 5 }, alts: {} },
    };
  },
};

// 이전 루틴 종목 id → 루틴 파일 id (v6)
export const RENAMED = {
  negPullup: 'negative_pullup', bench: 'bench_press', smithBench: 'smith_bench_press', assistPullup: 'assisted_pullup',
  tbarRow: 't_bar_row', dbLateral: 'db_lateral_raise', ezCurl: 'ez_bar_curl', backSquat: 'back_squat', rdl: 'romanian_deadlift',
  legPress: 'leg_press', smithCalf: 'smith_calf_raise', latPulldown: 'wide_lat_pulldown', inclineMachine: 'incline_press_machine',
  cableRow: 'cable_seated_row', lowPulleyRow: 'low_pulley_row', dbShoulder: 'db_shoulder_press', shoulderMachine: 'shoulder_press_machine',
  cableLateral: 'cable_lateral_raise', rearDelt: 'rear_delt_machine', ohExtension: 'cable_overhead_extension', inclineCurl: 'incline_db_curl',
  bayesianCurl: 'cable_bayesian_curl', legCurl: 'leg_curl', pallof: 'cable_pallof_press',
  clusterPullup: 'cluster_pullup', strictPullup: 'strict_pullup', weightedPullup: 'weighted_pullup',
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
  for (const k of ['tests', 'sessions']) if (!Array.isArray(out[k])) out[k] = [];
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
