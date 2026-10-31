// FITREP 루틴 데이터 — UI는 이 파일의 데이터로만 렌더한다.
// 개인 데이터(이름·체중·기록)는 여기에 넣지 않는다.

// kind: main(메인 리프트) | accessory(보조) | assist(어시스트, 보조 무게↓가 진보) |
//       negative(네거티브 단계) | plyo(판정 없음) | bodyweight(무게 없음)
// equip: barbell | dumbbell | machine | cable | smith | bodyweight | assist
export const EXERCISES = {
  negPullup:     { name: '네거티브 풀업', kind: 'negative', equip: 'bodyweight', region: 'upper', target: '광배·대원근 — 내려갈 때 더 큰 힘, 신경계 먼저 학습' },
  bench:         { name: '바벨 벤치프레스', kind: 'main', equip: 'barbell', region: 'upper', target: '대흉근·전면삼각·삼두' },
  smithBench:    { name: '스미스 벤치프레스', kind: 'main', equip: 'smith', region: 'upper', target: '대흉근·전면삼각·삼두' },
  assistPullup:  { name: '어시스트 풀업(어깨너비 오버그립)', kind: 'assist', equip: 'assist', region: 'upper', target: '광배 — 턱걸이와 같은 궤적으로 볼륨' },
  tbarRow:       { name: '티바로우', kind: 'accessory', equip: 'barbell', region: 'upper', target: '광배·능형근·중부승모' },
  dbLateral:     { name: '덤벨 사이드 레터럴', kind: 'accessory', equip: 'dumbbell', region: 'upper', target: '측면삼각 — 어깨 너비' },
  ezCurl:        { name: 'EZ바 컬', kind: 'accessory', equip: 'barbell', region: 'upper', target: '이두·상완근 — 턱걸이 보조근' },

  jumpSquat:     { name: '점프 스쿼트(맨몸)', kind: 'plyo', equip: 'bodyweight', region: 'lower', target: 'SSC·힘 발현 속도' },
  backSquat:     { name: '백스쿼트', kind: 'main', equip: 'barbell', region: 'lower', target: '대퇴사두·대둔근·대내전근' },
  rdl:           { name: '루마니안 데드리프트(바벨)', kind: 'accessory', equip: 'barbell', region: 'lower', target: '햄스트링·대둔근' },
  legPress:      { name: '레그프레스', kind: 'accessory', equip: 'machine', region: 'lower', target: '대퇴사두 — 척추 부담 없이 볼륨' },
  smithCalf:     { name: '스미스 카프레이즈(무릎 편 채)', kind: 'accessory', equip: 'smith', region: 'lower', target: '비복근' },
  legRaise:      { name: '레그레이즈(딥스 손잡이)', kind: 'bodyweight', equip: 'bodyweight', region: 'lower', target: '복직근 하부·장요근' },

  latPulldown:   { name: '와이드 랫풀다운', kind: 'accessory', equip: 'cable', region: 'upper', target: '광배 넓이' },
  inclineMachine:{ name: '인클라인 벤치프레스 머신', kind: 'accessory', equip: 'machine', region: 'upper', target: '대흉근 쇄골부(윗가슴)' },
  cableRow:      { name: '케이블 시티드 로우(V그립)', kind: 'accessory', equip: 'cable', region: 'upper', target: '광배 하부·능형근' },
  lowPulleyRow:  { name: '케이블 아래 도르래 로우(벤치)', kind: 'accessory', equip: 'cable', region: 'upper', target: '광배 하부·능형근' },
  dbShoulder:    { name: '덤벨 숄더프레스(앉아서)', kind: 'accessory', equip: 'dumbbell', region: 'upper', target: '전면·측면삼각·삼두' },
  shoulderMachine:{ name: '숄더프레스 머신', kind: 'accessory', equip: 'machine', region: 'upper', target: '전면·측면삼각·삼두' },
  cableLateral:  { name: '케이블 사이드 레터럴', kind: 'accessory', equip: 'cable', region: 'upper', target: '측면삼각' },
  rearDelt:      { name: '리어델트 머신', kind: 'accessory', equip: 'machine', region: 'upper', target: '후면삼각' },
  ohExtension:   { name: '케이블 오버헤드 익스텐션(로프)', kind: 'accessory', equip: 'cable', region: 'upper', target: '삼두 장두' },
  inclineCurl:   { name: '인클라인 덤벨 컬', kind: 'accessory', equip: 'dumbbell', region: 'upper', target: '이두 장두' },
  bayesianCurl:  { name: '케이블 베이지안 컬', kind: 'accessory', equip: 'cable', region: 'upper', target: '이두 장두' },

  deadlift:      { name: '컨벤셔널 데드리프트', kind: 'main', equip: 'barbell', region: 'lower', target: '대둔근·햄스트링·척추기립근' },
  bulgarian:     { name: '불가리안 스플릿 스쿼트(덤벨)', kind: 'accessory', equip: 'dumbbell', region: 'lower', target: '대둔근·대퇴사두 + 중둔근 안정화' },
  hipThrust:     { name: '힙쓰러스트(바벨)', kind: 'accessory', equip: 'barbell', region: 'lower', target: '대둔근' },
  smithHipThrust:{ name: '힙쓰러스트(스미스)', kind: 'accessory', equip: 'smith', region: 'lower', target: '대둔근' },
  legCurl:       { name: '레그컬', kind: 'accessory', equip: 'machine', region: 'lower', target: '햄스트링(무릎 굴곡)' },
  seatedCalf:    { name: '앉아서 카프레이즈(덤벨)', kind: 'accessory', equip: 'dumbbell', region: 'lower', target: '가자미근' },
  pallof:        { name: '케이블 팔로프 프레스', kind: 'accessory', equip: 'cable', region: 'lower', target: '복횡근·복사근 — 항회전' },

  // 턱걸이 계급에 따라 상체A 1번(UA1)에 들어가는 종목
  clusterPullup: { name: '클러스터 턱걸이', kind: 'bodyweight', equip: 'bodyweight', region: 'upper', target: '광배 — 1~2개씩 자주, 실패 없이 볼륨' },
  strictPullup:  { name: '정자세 턱걸이', kind: 'bodyweight', equip: 'bodyweight', region: 'upper', target: '광배·대원근 — 매 세트 2개 남기고' },
  weightedPullup:{ name: '가중 턱걸이(덤벨)', kind: 'accessory', equip: 'dumbbell', region: 'upper', target: '광배 — 덤벨을 발/벨트에 끼우고' },
};

// 세션 정의. slot.items가 2개면 슈퍼세트(A→B 후 휴식). rest는 [min,max]초 — 기본은 중간값.
// item: { ex, sets, reps:[lo,hi], rir:[lo,hi]|null, perSide?, note?, alts?:[exId] }
export const SESSIONS = {
  UA: {
    key: 'UA', name: '상체A', code: 'UPPER A', title: '벤치·턱걸이 근력', region: 'upper', minutes: 55, dow: 1,
    slots: [
      { id: 'UA1', rest: [90, 90], pullupSlot: true, items: [
        { ex: 'negPullup', sets: 3, reps: [3, 3], note: '5초 하강 — 턱걸이 단계 슬롯' } ] },
      { id: 'UA2', rest: [120, 180], items: [
        { ex: 'bench', sets: 4, reps: [5, 6], rir: [2, 2], note: '견갑 모아 고정, 바는 유두선 아래', alts: ['smithBench'] } ] },
      { id: 'UA3', rest: [120, 120], items: [
        { ex: 'assistPullup', sets: 3, reps: [6, 8], rir: [1, 2], note: '무게 = 보조 무게' } ] },
      { id: 'UA4', rest: [90, 90], items: [
        { ex: 'tbarRow', sets: 3, reps: [8, 10], note: '팔꿈치 45°, 견갑 끝까지' } ] },
      { id: 'UA5', rest: [60, 60], items: [
        { ex: 'dbLateral', sets: 4, reps: [12, 15] },
        { ex: 'ezCurl', sets: 3, reps: [8, 12] } ] },
    ],
  },
  LA: {
    key: 'LA', name: '하체A', code: 'LOWER A', title: '스쿼트·순발력', region: 'lower', minutes: 52, dow: 2,
    note: '체력단련 직후면 일반 워밍업 생략',
    slots: [
      { id: 'LA1', rest: [60, 60], items: [
        { ex: 'jumpSquat', sets: 3, reps: [5, 5], note: '착지 조용히, 증량 판정 없음' } ] },
      { id: 'LA2', rest: [150, 150], items: [
        { ex: 'backSquat', sets: 4, reps: [5, 6], rir: [2, 2], note: '허벅지 수평 아래까지' } ] },
      { id: 'LA3', rest: [120, 120], items: [
        { ex: 'rdl', sets: 3, reps: [8, 10], note: '엉덩이 뒤로 빼는 힌지' } ] },
      { id: 'LA4', rest: [90, 90], items: [
        { ex: 'legPress', sets: 3, reps: [10, 12] } ] },
      { id: 'LA5', rest: [60, 60], items: [
        { ex: 'smithCalf', sets: 3, reps: [10, 15] },
        { ex: 'legRaise', sets: 3, reps: [10, 15] } ] },
    ],
  },
  UB: {
    key: 'UB', name: '상체B', code: 'UPPER B', title: '윗가슴·어깨·등 넓이', region: 'upper', minutes: 56, dow: 4,
    slots: [
      { id: 'UB1', rest: [90, 90], items: [
        { ex: 'latPulldown', sets: 4, reps: [8, 10], note: '팔꿈치를 옆구리로' } ] },
      { id: 'UB2', rest: [120, 120], items: [
        { ex: 'inclineMachine', sets: 3, reps: [8, 10] } ] },
      { id: 'UB3', rest: [75, 75], items: [
        { ex: 'cableRow', sets: 3, reps: [10, 12], alts: ['lowPulleyRow'] } ] },
      { id: 'UB4', rest: [90, 90], items: [
        { ex: 'dbShoulder', sets: 3, reps: [8, 10], alts: ['shoulderMachine'] } ] },
      { id: 'UB5', rest: [45, 60], items: [
        { ex: 'cableLateral', sets: 4, reps: [12, 15] },
        { ex: 'rearDelt', sets: 3, reps: [15, 20] } ] },
      { id: 'UB6', rest: [45, 60], items: [
        { ex: 'ohExtension', sets: 3, reps: [10, 15] },
        { ex: 'inclineCurl', sets: 2, reps: [10, 12], alts: ['bayesianCurl'] } ] },
    ],
  },
  LB: {
    key: 'LB', name: '하체B', code: 'LOWER B', title: '데드·단측·둔근', region: 'lower', minutes: 52, dow: 5,
    slots: [
      { id: 'LB1', rest: [180, 180], items: [
        { ex: 'deadlift', sets: 3, reps: [4, 5], rir: [2, 2], note: '바를 정강이에 붙이고 등 중립' } ] },
      { id: 'LB2', rest: [90, 90], items: [
        { ex: 'bulgarian', sets: 3, reps: [8, 10], perSide: true, note: '다리당' } ] },
      { id: 'LB3', rest: [90, 90], items: [
        { ex: 'hipThrust', sets: 3, reps: [8, 12], alts: ['smithHipThrust'] } ] },
      { id: 'LB4', rest: [60, 60], items: [
        { ex: 'legCurl', sets: 3, reps: [10, 15] } ] },
      { id: 'LB5', rest: [45, 45], items: [
        { ex: 'seatedCalf', sets: 3, reps: [12, 15] },
        { ex: 'pallof', sets: 3, reps: [10, 10], perSide: true, note: '좌우' } ] },
    ],
  },
};

export const SESSION_ORDER = ['UA', 'LA', 'UB', 'LB'];

// 요일(1=월 … 7=일) → 헬스 세션. 없는 요일은 헬스 휴식.
export const WEEK_PLAN = { 1: 'UA', 2: 'LA', 4: 'UB', 5: 'LB' };

// 네거티브 풀업 진행 단계: "수월했음" 체크 시 다음 단계로.
export const NEGATIVE_STAGES = [
  { sets: 3, reps: 3, tempo: 5, label: '3×3 · 5초 하강' },
  { sets: 3, reps: 5, tempo: 5, label: '3×5 · 5초 하강' },
  { sets: 3, reps: 5, tempo: 8, label: '3×5 · 8초 하강' },
];

// 체력단련 미션(매일 업힐 2.8km는 기록하지 않음). type: situp | pushup | skill | run | interval | rest | test
export const CALISTHENICS = {
  1: [{ type: 'situp' }],
  2: [{ type: 'pushup' }],
  3: [{ type: 'skill' }, { type: 'situp' }],
  4: [{ type: 'run' }],
  5: [{ type: 'pushup' }, { type: 'situp' }],
  6: [{ type: 'skill' }, { type: 'interval', optional: true }],
  7: [{ type: 'rest' }, { type: 'test', biweekly: true }],
};

export const MISSION_RULES = {
  situp: { ratio: 0.6, sets: 4, rest: 60, label: '윗몸일으키기' },
  pushup: { ratio: 0.6, sets: 5, rest: 60, label: '팔굽혀펴기' },
};

// (1단계 표기용) 기본 스킬 순서
export const SKILL_STEPS = [
  { name: '스캡 풀업', dose: '2×8', cue: '팔 편 채 어깨만 끌어내려 몸을 살짝 띄운다' },
  { name: '탑 홀드', dose: '3×최대', cue: '점프로 올라가 턱을 바 위에 두고 버틴다' },
  { name: '네거티브', dose: '2×2 (5초)', cue: '5초 동안 내려온다' },
  { name: '데드행', dose: '1×최대', cue: '악력 — 목표 60초' },
];
export const SKILL_MINUTES = 10;

export const INTERVAL = { reps: 6, distance: 400, walkSec: 90, divisor: 7.5, cueAt: 0.5 }; // cueAt: 200m 예상 시점(페이스의 50%)

// 턱걸이 계급(정자세 최대로 판정). bars = 계급장 가로 막대 수.
// ua1: 상체A 1번 슬롯 처방(repsFromMax: 최대 − n개), skill: SKILL_PLANS 키
export const PULLUP_RANKS = [
  { name: '이병', code: 'PVT', min: 0, bars: 1,
    ua1: { ex: 'negPullup', sets: 3, reps: [3, 3], note: '5초 하강 — 수월하면 단계 올림' }, skill: 'basic' },
  { name: '일병', code: 'PFC', min: 3, bars: 2,
    ua1: { ex: 'clusterPullup', sets: 6, reps: [1, 2], rest: 45, note: '1~2개씩, 실패 전에 멈춤' }, skill: 'ladder3' },
  { name: '상병', code: 'CPL', min: 6, bars: 3,
    ua1: { ex: 'strictPullup', sets: 4, repsFromMax: 2, note: '매 세트 2개 남기고' }, skill: 'ladder4' },
  { name: '병장', code: 'SGT', min: 10, bars: 4,
    ua1: { ex: 'weightedPullup', sets: 4, reps: [5, 5], note: '덤벨 끼우고 4×5' }, skill: 'ladder4' },
];

// 스킬 데이 계획. hold: 스톱워치로 버티는 시간 기록, ladder: 사다리 반복 수 × rounds
export const SKILL_PLANS = {
  basic: [
    { id: 'scap', name: '스캡 풀업', sets: 2, reps: 8, cue: '팔 편 채 어깨만 끌어내려 몸을 살짝 띄운다' },
    { id: 'top', name: '탑 홀드', sets: 3, hold: true, cue: '점프로 올라가 턱을 바 위에 두고 버틴다(최대)' },
    { id: 'neg', name: '네거티브', sets: 2, reps: 2, cue: '5초 동안 내려온다' },
    { id: 'hang', name: '데드행', sets: 1, hold: true, goalSec: 60, cue: '악력 — 목표 60초' },
  ],
  ladder3: [{ id: 'ladder', name: '사다리 1-2-3', ladder: [1, 2, 3], rounds: 2, cue: '1개→2개→3개, 사이 짧게 쉬고 2회 반복' }],
  ladder4: [{ id: 'ladder', name: '사다리 1-2-3-4', ladder: [1, 2, 3, 4], rounds: 2, cue: '1→2→3→4개, 2회 반복 — 실패 전에 멈춤' }],
};

// 체력 검정 2분 모드
export const PT_TEST = { sec: 120, cueEvery: 30, countdown: 3, items: { pushups: '팔굽혀펴기 2분', situps: '윗몸일으키기 2분' } };

// 작전 재편성 패스 사유
export const PASS_REASONS = ['당직', '훈련', '휴가', '외출·외박', '컨디션', '기타'];

// 체중·단백질
export const BODY = { avgDays: 7, compareDays: 14, minGain: 0.2, kcal: 300, weeklyGain: [0.2, 0.4], minEntries: 3 };

export const WARMUP_STEPS = [
  { pct: 0, reps: 10, label: '빈봉' },
  { pct: 0.5, reps: 5 },
  { pct: 0.7, reps: 3 },
  { pct: 0.85, reps: 1 },
];

// 60분 가드: 세트당 수행 시간 가정(초)과 한도(분)
export const GUARD = { setSec: 40, limitMin: 60 };
