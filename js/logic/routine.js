// 루틴 JSON(schemaVersion 1) → 앱 프로그램 구조 (순수 함수)
// 형식은 data/routine.js 참고: days[].blocks[](single|superset).exercises[]

const KIND = { main: 'main', accessory: 'accessory', isolation: 'isolation', assisted: 'assist', negative: 'negative' };
const EQUIP = { barbell: 'barbell', ez_bar: 'barbell', dumbbell: 'dumbbell', machine: 'machine', cable: 'cable', smith: 'smith', assisted_machine: 'assist', pullup_bar: 'bodyweight' };
const LOWER = ['대퇴사두', '대둔근', '햄스트링', '종아리', '척추기립근'];

// 루틴 파일 형식 점검: 문제 목록(없으면 [])
export function validateRoutine(r) {
  const out = [];
  if (r?.schemaVersion !== 1) out.push('schemaVersion은 1이어야 합니다');
  if (!Array.isArray(r?.days) || !r.days.length) return [...out, 'days가 없습니다'];
  const ids = new Set();
  for (const d of r.days) {
    if (!d.id || ids.has(d.id)) out.push(`day id 없음/중복: ${d.id}`);
    ids.add(d.id);
    if (!(d.weekday >= 1 && d.weekday <= 7)) out.push(`${d.id}: weekday는 1~7`);
    if (d.rest) continue;
    if (!Array.isArray(d.blocks) || !d.blocks.length) { out.push(`${d.id}: blocks가 없습니다`); continue; }
    d.blocks.forEach((b, i) => {
      if (!(b.restSec > 0)) out.push(`${d.id} ${i + 1}번: restSec`);
      if (!b.exercises?.length) out.push(`${d.id} ${i + 1}번: exercises가 없습니다`);
      for (const e of b.exercises ?? []) {
        const at = `${d.id} ${i + 1}번 ${e.id ?? '?'}`;
        if (!e.id || !e.name) out.push(`${at}: id·name`);
        if (!KIND[e.category]) out.push(`${at}: category ${e.category}`);
        if (!(e.sets > 0)) out.push(`${at}: sets`);
        if (!(e.reps?.min > 0) || !(e.reps?.max >= e.reps?.min)) out.push(`${at}: reps`);
      }
    });
  }
  return out;
}

function exerciseDef(e, r) {
  const t = { primary: [], secondary: [], ...e.targets };
  const def = {
    name: e.name,
    kind: KIND[e.category],
    equip: EQUIP[e.equipment] ?? 'machine',
    region: t.primary.some((m) => LOWER.includes(m)) ? 'lower' : 'upper',
    target: [t.primary.join('·'), t.secondary.length ? `(+${t.secondary.join('·')})` : ''].filter(Boolean).join(' '),
    muscles: [...t.primary, ...t.secondary],
    warmup: !!e.warmupSets,
  };
  const it = r.intensity?.[e.category];
  if (it) def.intensity = { label: it.label, cue: it.cue };
  if (e.equipment === 'dumbbell') def.perHand = true;
  const st = e.start;
  if (st?.kg != null) def.start = st.kg;
  else if (st?.kgPerHand != null) def.start = st.kgPerHand;
  else if (st?.assistKg != null) def.start = Array.isArray(st.assistKg) ? Math.max(...st.assistKg) : st.assistKg; // 범위면 쉬운 쪽(보조 많이)
  const inc = e.increment ?? {};
  if (inc.kg != null) def.incKg = inc.kg;
  else if (inc.assistKg != null) def.incKg = Math.abs(inc.assistKg);
  else if (inc.step) def.incStep = inc.step; // 'machine' | 'dumbbell' → 설정의 한 칸·한 단계
  return def;
}

/**
 * @param {object} r      루틴 JSON
 * @param {object} extra  { exercises:{id:def} 대체·로드맵 종목, alts:{exId:[alt]}, codes:{dayId:'CHEST'} }
 */
export function buildProgram(r, extra = {}) {
  const EXERCISES = {}, SESSIONS = {}, WEEK_PLAN = {};
  const roadmapDays = new Set(Object.keys(r.pullupRoadmap?.stages?.[0] ?? {}).filter((k) => r.days.some((d) => d.id === k && !d.rest)));
  const days = [...r.days].sort((a, b) => a.weekday - b.weekday);
  for (const day of days) {
    if (day.rest) continue;
    const slots = day.blocks.map((b, i) => ({
      id: `${day.id}${i + 1}`,
      rest: [b.restSec, b.restSec],
      ...(i === 0 && roadmapDays.has(day.id) ? { pullupSlot: day.id } : {}),
      items: b.exercises.map((e) => {
        EXERCISES[e.id] ??= exerciseDef(e, r);
        const item = { ex: e.id, sets: e.sets, reps: [e.reps.min, e.reps.max], rir: e.rir ?? null, note: e.cue ?? '' };
        if (e.perSide) item.perSide = true;
        if (r.intensity?.[e.category]?.lastSetOnly) item.rirLastOnly = true;
        if (extra.alts?.[e.id]) item.alts = extra.alts[e.id];
        return item;
      }),
    }));
    SESSIONS[day.id] = {
      key: day.id, name: day.title, short: day.title.split(/\s*\+\s*/)[0],
      code: extra.codes?.[day.id] ?? day.id.toUpperCase(),
      minutes: day.estMin, dow: day.weekday, warmup: day.warmup ?? 'upper', notes: day.notes ?? [], slots,
    };
    // 삼두를 쓰는 날(가슴·어깨·팔): 요일을 바꿀 때 연달아 두지 않는다
    SESSIONS[day.id].triceps = slots.some((s) => s.items.some((it) => EXERCISES[it.ex].muscles.includes('삼두')));
    WEEK_PLAN[day.weekday] = day.id;
  }
  for (const [id, def] of Object.entries(extra.exercises ?? {})) EXERCISES[id] ??= def;
  return {
    EXERCISES, SESSIONS, WEEK_PLAN,
    SESSION_ORDER: Object.keys(SESSIONS),
    GENERAL_WARMUP: r.warmup?.general ?? null,
    FIRST_WEEK: r.firstWeek ?? null,
    LIMIT_MIN: r.sessionLimitMin ?? 60,
  };
}
