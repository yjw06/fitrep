// FITREP 프로그램 데이터 — UI는 여기서 내보내는 구조로만 렌더한다.
// 루틴 원본은 data/routine.js(사용자 JSON). 여기서는 그걸 앱 구조로 바꾸고,
// JSON에 글로만 적힌 것(대체 종목·턱걸이 로드맵 처방)과 앱 상수를 보충한다.
// 개인 데이터(이름·체중·기록)는 넣지 않는다.
import ROUTINE from './routine.js';
import { buildProgram } from '../js/logic/routine.js';

const I = (cat) => ({ label: ROUTINE.intensity[cat].label, cue: ROUTINE.intensity[cat].cue });

// 루틴 메모의 대체 종목: 문자열 = 같은 처방, 객체 = 그 처방
const ALTS = {
  bench_press: ['smith_bench_press'],
  assisted_dip: [{ ex: 'high_to_low_cable_fly', sets: 3, reps: [12, 15], rir: [0, 1], rirLastOnly: true, note: '어깨 앞쪽이 불편할 때 — 높은 도르래 → 반대쪽 골반' }],
  cable_seated_row: ['low_pulley_row'],
  db_shoulder_press: ['shoulder_press_machine'],
  incline_db_curl: ['cable_bayesian_curl'],
};

const EXTRA = {
  // 대체 종목
  smith_bench_press:      { name: '스미스 벤치프레스', kind: 'main', equip: 'smith', region: 'upper', target: '가슴 중부 (+어깨 전면·삼두)', muscles: ['가슴 중부', '어깨 전면', '삼두'], warmup: true, start: 40, incKg: 2.5, intensity: I('main') },
  high_to_low_cable_fly:  { name: '싱글암 하이투로우 케이블 플라이', kind: 'isolation', equip: 'cable', region: 'upper', target: '가슴 하부', muscles: ['가슴 하부'], incStep: 'machine', intensity: I('isolation') },
  low_pulley_row:         { name: '케이블 아래 도르래 로우(벤치)', kind: 'accessory', equip: 'cable', region: 'upper', target: '등 중앙 (+어깨 후면)', muscles: ['등 중앙', '어깨 후면'], incStep: 'machine', intensity: I('accessory') },
  shoulder_press_machine: { name: '숄더프레스 머신', kind: 'accessory', equip: 'machine', region: 'upper', target: '어깨 전면 (+삼두)', muscles: ['어깨 전면', '삼두'], incStep: 'machine', intensity: I('accessory') },
  cable_bayesian_curl:    { name: '케이블 베이지안 컬', kind: 'isolation', equip: 'cable', region: 'upper', target: '이두', muscles: ['이두'], incStep: 'machine', intensity: I('isolation') },
  // 턱걸이 로드맵 2~4단계(화·금 1번)
  cluster_pullup:  { name: '클러스터 턱걸이', kind: 'bodyweight', equip: 'bodyweight', region: 'upper', target: '광배근 (+이두)', muscles: ['광배근', '이두'] },
  strict_pullup:   { name: '정자세 턱걸이', kind: 'bodyweight', equip: 'bodyweight', region: 'upper', target: '광배근 (+이두)', muscles: ['광배근', '이두'] },
  weighted_pullup: { name: '가중 턱걸이(덤벨)', kind: 'main', equip: 'dumbbell', region: 'upper', target: '광배근 (+이두)', muscles: ['광배근', '이두'], incStep: 'dumbbell', intensity: I('main') },
  cluster_chinup:  { name: '친업 클러스터', kind: 'bodyweight', equip: 'bodyweight', region: 'upper', target: '광배근 (+이두)', muscles: ['광배근', '이두'] },
  strict_chinup:   { name: '정자세 친업', kind: 'bodyweight', equip: 'bodyweight', region: 'upper', target: '광배근 (+이두)', muscles: ['광배근', '이두'] },
  weighted_chinup: { name: '가중 친업(덤벨)', kind: 'main', equip: 'dumbbell', region: 'upper', target: '광배근 (+이두)', muscles: ['광배근', '이두'], incStep: 'dumbbell', intensity: I('main') },
  // 이전 루틴에만 있던 종목 — 지난 기록 이름 표시용(처방에는 안 씀)
  jumpSquat:      { name: '점프 스쿼트(맨몸)', kind: 'bodyweight', equip: 'bodyweight', region: 'lower', muscles: [], retired: true },
  legRaise:       { name: '레그레이즈', kind: 'bodyweight', equip: 'bodyweight', region: 'lower', muscles: [], retired: true },
  seatedCalf:     { name: '앉아서 카프레이즈(덤벨)', kind: 'accessory', equip: 'dumbbell', region: 'lower', muscles: [], retired: true },
  bulgarian:      { name: '불가리안 스플릿 스쿼트(덤벨)', kind: 'accessory', equip: 'dumbbell', region: 'lower', muscles: [], retired: true },
  hipThrust:      { name: '힙쓰러스트(바벨)', kind: 'accessory', equip: 'barbell', region: 'lower', muscles: [], retired: true },
  smithHipThrust: { name: '힙쓰러스트(스미스)', kind: 'accessory', equip: 'smith', region: 'lower', muscles: [], retired: true },
};

const CODES = { mon: 'CHEST', tue: 'BACK', wed: 'DELTS', thu: 'LEGS', fri: 'ARMS' };

const P = buildProgram(ROUTINE, { exercises: EXTRA, alts: ALTS, codes: CODES });

export const ROUTINE_NAME = ROUTINE.name;
export const { EXERCISES, SESSIONS, SESSION_ORDER, WEEK_PLAN, GENERAL_WARMUP, FIRST_WEEK } = P;

// 이전 루틴 세션 키 — 지난 기록 이름 표시용
export const RETIRED_SESSIONS = { UA: '상체A', LA: '하체A', UB: '상체B', LB: '하체B' };

// 턱걸이 로드맵: 격주 일요일 정자세 최대로 단계를 정하고 화·금 1번을 함께 바꾼다.
// 1단계는 루틴 파일 처방 그대로. repsFromMax: 최대 − n개, rest: 휴식(초) 덮어쓰기
export const PULLUP_STAGES = [
  { stage: 1, min: 0, label: '1~2개',
    tue: { ex: 'negative_pullup', sets: 3, reps: [3, 3] },
    fri: { ex: 'assisted_chinup', sets: 3, reps: [6, 8], rir: [1, 2] } },
  { stage: 2, min: 3, label: '3~5개',
    tue: { ex: 'cluster_pullup', sets: 6, reps: [1, 2], rest: 45, note: '1~2개씩, 실패 전에 멈춤' },
    fri: { ex: 'cluster_chinup', sets: 5, reps: [1, 2], rest: 45, note: '1~2개씩, 실패 전에 멈춤' } },
  { stage: 3, min: 6, label: '6~9개',
    tue: { ex: 'strict_pullup', sets: 4, repsFromMax: 2, note: '매 세트 2개 남기고' },
    fri: { ex: 'strict_chinup', sets: 3, repsFromMax: 2, note: '매 세트 2개 남기고' } },
  { stage: 4, min: 10, label: '10개 이상',
    tue: { ex: 'weighted_pullup', sets: 4, reps: [5, 5], rir: [2, 2], note: '덤벨을 끼우고' },
    fri: { ex: 'weighted_chinup', sets: 3, reps: [6, 6], rir: [2, 2], note: '덤벨을 끼우고' } },
];

// 네거티브 풀업 진행 단계: 세션 후 "수월했음" 체크 시 다음 단계로(3×3 → 3×5 → 하강 8초)
export const NEGATIVE_STAGES = [
  { sets: 3, reps: 3, tempo: 5, label: '3×3 · 5초 하강' },
  { sets: 3, reps: 5, tempo: 5, label: '3×5 · 5초 하강' },
  { sets: 3, reps: 5, tempo: 8, label: '3×5 · 8초 하강' },
];

// 메인 리프트 워밍업: 빈봉 10 → 50%×5 → 70%×3 → 85%×1 → 본세트
export const WARMUP_STEPS = [
  { pct: 0, reps: 10, label: '빈봉' },
  { pct: 0.5, reps: 5 },
  { pct: 0.7, reps: 3 },
  { pct: 0.85, reps: 1 },
];

// 60분 가드: 세트당 수행 시간 가정(초)과 한도(분, 루틴 sessionLimitMin)
export const GUARD = { setSec: 40, limitMin: P.LIMIT_MIN };
