// 금일 임무: 검정일 카드 + 세션 카드(패스·재편성) + 체력단련 미션(결과 기록·내일 브리핑) + 이번 주 진행 4칸
import { h, mount, label, stamp } from './dom.js';
import { state, save } from '../store.js';
import { dowOf, dowKo, shortDate, fmtClock, addDays, mondayOf } from '../logic/dates.js';
import { missionsFor, weekMissions } from '../logic/missions.js';
import { testAnchor, isTestDay } from '../logic/pttest.js';
import { weekDone } from '../logic/stats.js';
import { P, today, weekInfo, exName, prescText, planFor, pullupRank, scheduleFor, passOf, reschedOf, insignia } from './common.js';
import { startSession } from './session.js';
import { passDialog, reschedCard, cancelPass } from './reschedule.js';
import { rerender, go } from './nav.js';

let picked = null; // 수동 선택한 세션(오늘 날짜 한정)

function sessionCard(date, wi) {
  const planned = scheduleFor(date)[date] ?? null;
  const pass = passOf(date);
  if (picked && picked.date !== date) picked = null;
  const key = picked?.key ?? (pass ? null : planned);
  const doneToday = state.sessions.filter((s) => s.date === date);

  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': '세션 선택' },
    P.SESSION_ORDER.map((k) => h('button', {
      type: 'button', class: `chip${k === key ? ' on' : ''}`, 'data-testid': `pick-${k}`,
      onclick: () => { picked = { date, key: k === key && picked?.key ? null : k }; rerender(); },
    }, h('span', { class: 'en' }, P.SESSIONS[k].code), P.SESSIONS[k].name)));

  if (state.active) {
    const a = state.active;
    return h('div', { class: 'card hud active-card' },
      label('MISSION IN PROGRESS'),
      h('h2', null, `${P.SESSIONS[a.key].name} — 작전 진행 중`),
      h('button', { class: 'btn primary block big', onclick: () => go('#session') }, '작전 복귀'));
  }

  if (!key) {
    return h('div', { class: 'card hud', 'data-testid': 'session-card' },
      label('MISSION'),
      pass
        ? [h('h2', null, `패스 — ${pass.reason}`),
          h('p', { class: 'muted small' }, `오늘 ${P.SESSIONS[pass.key]?.name ?? ''} 세션을 넘겼습니다. 아래 작전 재편성안을 고르세요.`),
          h('button', { class: 'btn ghost block', style: 'margin-bottom:10px', onclick: () => { cancelPass(date); picked = null; rerender(); } }, '패스 취소')]
        : [h('h2', null, '헬스 휴식'), h('p', { class: 'muted small' }, '오늘은 헬스 세션이 없습니다. 필요하면 아래에서 세션을 골라 진행하세요.')],
      chips);
  }

  const def = P.SESSIONS[key];
  const plan = planFor(key, wi);
  const done = doneToday.some((s) => s.key === key);
  const r = pullupRank();
  return h('div', { class: 'card hud', 'data-testid': 'session-card' },
    h('div', { class: 'spread' }, label(`MISSION · ${def.code}`), done && stamp()),
    h('h2', null, `${def.name} — ${def.title}`),
    h('div', { class: 'row wrap' },
      h('span', { class: 'badge' }, `WEEK ${wi.week}`),
      h('span', { class: 'badge' }, `약 ${def.minutes}분`),
      wi.deload && h('span', { class: 'badge amber' }, '정비 주간 · 세트 절반'),
      wi.week === 1 && h('span', { class: 'badge' }, '탐색 주 · RIR 3'),
      picked?.key && planned !== key && h('span', { class: 'badge od' }, '수동 선택'),
      !picked?.key && reschedOf(date)?.applied && planned !== P.WEEK_PLAN[dowOf(date)] && h('span', { class: 'badge od' }, '재편성')),
    def.note && h('p', { class: 'muted small' }, def.note),
    h('ol', { class: 'small', style: 'padding-left:20px;margin:10px 0' },
      plan.slots.map((slot) => {
        const es = plan.entries.filter((e) => e.slotId === slot.id);
        const isPull = def.slots.find((s) => s.id === slot.id)?.pullupSlot;
        return h('li', null, es.map((e, i) => [i ? ' → ' : '', exName(e.ex), h('span', { class: 'muted' }, ` ${prescText(e.presc)}`)]),
          isPull && h('span', { class: 'badge', style: 'margin-left:6px' }, insignia(r.rank.bars, 12), r.rank.name),
          es.length > 1 && h('span', { class: 'ss-tag' }, ' SUPERSET'));
      })),
    chips,
    h('div', { style: 'height:10px' }),
    h('button', { class: 'btn primary block big', 'data-testid': 'start', onclick: () => startSession(key) },
      h('span', { class: 'en' }, 'EXECUTE'), done ? ' 한 번 더 작전 개시' : ' 작전 개시'),
    planned === key && !done && !picked?.key && h('button', { class: 'btn ghost block', style: 'margin-top:8px', 'data-testid': 'pass', onclick: () => passDialog(date, key) }, '오늘 패스 → 작전 재편성'));
}

function testDayCard(date) {
  if (!isTestDay(date, testAnchor(state.settings))) return null;
  const done = state.tests.some((t) => t.date === date);
  return h('div', { class: 'card hud active-card', 'data-testid': 'testday-card' },
    h('div', { class: 'spread' }, label('PT TEST DAY'), done && stamp()),
    h('h2', null, '체력 검정일'),
    h('p', { class: 'muted small' }, '정자세 턱걸이 최대 · 팔굽 2분 · 윗몸 2분 → 60% 미션과 턱걸이 계급이 다시 계산됩니다.'),
    h('button', { class: 'btn primary block big', onclick: () => go('#test') }, done ? '검정 기록 보기' : '체력 검정 시작'));
}

// ── 체력단련(PT) 미션: 체력단련 중엔 폰을 못 쓰므로 전날 저녁 브리핑 + 끝난 뒤 결과 기록 ──
const STATUS = { done: ['완료', '✓'], partial: ['일부', '△'], skip: ['못함', '✕'] };
let ptDay = null; // 결과를 기록할 날짜(기본 오늘, 이번 주 지난 날 선택 가능)

function ptItems(date, rankIdx) {
  return missionsFor(dowOf(date), {
    tests: state.tests, goals: state.settings.goals, program: P, rankIdx,
    testDay: isTestDay(date, testAnchor(state.settings)),
  });
}

// 한 줄 요약(오늘 — 결과 기록용)
function ptLine(m) {
  switch (m.type) {
    case 'situp':
    case 'pushup':
      return m.missing ? `${m.title} — 검정 값 없음` : `${m.title} ${m.reps}개 × ${m.sets}세트`;
    case 'skill': return `${m.title}: ${m.steps.map((s) => `${s.name} ${s.dose}`).join(' → ')}`;
    case 'interval': return `${m.title}${m.optional ? '(선택)' : ''} · 목표 ${m.pace ? fmtClock(m.pace) : '—'}/400m`;
    case 'test': return m.due ? '체력 검정일 — 검정 탭에서 측정' : null;
    default: return m.title;
  }
}

// 자세한 브리핑(내일 — 전날 저녁에 외워 둘 것)
function ptBrief(m, rank) {
  if (m.type === 'situp' || m.type === 'pushup') {
    return h('div', { class: 'mission-item' }, h('h3', null, m.title),
      m.missing
        ? h('div', { class: 'muted small' }, '검정 값이 없습니다 — 검정 탭에서 입력하세요')
        : h('div', null, h('span', { class: 'kpi' }, m.reps), ` 개 × ${m.sets}세트`, h('span', { class: 'muted small' }, ` · 휴식 ${m.rest}초 · 최대 ${m.max}의 60%`)));
  }
  if (m.type === 'skill') {
    return h('div', { class: 'mission-item' }, h('h3', null, m.title),
      h('div', { class: 'row muted small' }, insignia(rank.bars, 14), m.sub),
      h('ol', null, m.steps.map((s) => h('li', null, h('b', null, `${s.name} ${s.dose}`), h('span', { class: 'muted small' }, ` — ${s.cue}`)))));
  }
  if (m.type === 'interval') {
    return h('div', { class: 'mission-item' }, h('h3', null, `${m.title}${m.optional ? ' (선택)' : ''}`),
      h('div', null, '목표 페이스 ', h('span', { class: 'kpi' }, m.pace ? fmtClock(m.pace) : '—'), h('span', { class: 'muted small' }, ` /400m · 사이 ${m.walk}초 걷기`)));
  }
  if (m.type === 'test' && !m.due) return null;
  return h('div', { class: 'mission-item' }, h('h3', null, m.type === 'test' ? '체력 검정일' : m.title), m.sub && h('div', { class: 'muted small' }, m.sub));
}

function missionCard(date) {
  const r = pullupRank();
  const anchor = testAnchor(state.settings);
  const mon = mondayOf(date);
  if (ptDay && (ptDay >= date || ptDay < mon)) ptDay = null;
  const sel = ptDay ?? date;
  const week = weekMissions({ monday: mon, today: date, missions: state.missions, program: P, anchor });
  const selDay = week.days.find((d) => d.date === sel);
  const todayItems = ptItems(date, r.idx);
  const tomorrow = addDays(date, 1);
  const tomorrowItems = ptItems(tomorrow, r.idx);
  const cur = state.missions[sel]?.status ?? null;

  const record = selDay.recordable
    ? h('div', { class: 'seg', role: 'group', 'aria-label': '체력단련 결과' }, Object.entries(STATUS).map(([k, [text, icon]]) =>
      h('button', {
        type: 'button', class: `${k}${cur === k ? ' on' : ''}`, 'aria-pressed': String(cur === k), 'data-testid': `pt-${k}`,
        onclick: () => {
          if (cur === k) delete state.missions[sel];
          else state.missions[sel] = { status: k, at: Date.now() };
          save(); rerender();
        },
      }, `${icon} ${text}`)))
    : h('div', { class: 'muted small' }, '오늘은 기록할 미션이 없습니다. 지난 날 결과는 아래 칸을 눌러 기록하세요.');

  const strip = h('div', { class: 'week7', 'data-testid': 'pt-week' }, week.days.map((d) => {
    const st = d.status ? STATUS[d.status] : null;
    const pickable = d.recordable && !d.future;
    return h('button', {
      type: 'button', disabled: !pickable, 'data-testid': `pt-day-${d.date}`,
      class: [d.status && `s-${d.status}`, !d.recordable && 'na', d.future && 'future', d.date === sel && 'sel'].filter(Boolean).join(' '),
      'aria-label': `${shortDate(d.date)} ${d.label} ${st ? st[0] : d.recordable ? '미기록' : '기록 없음'}`,
      onclick: () => { ptDay = d.date === date ? null : d.date; rerender(); },
    }, h('span', { class: 'd' }, dowKo(d.dow)), h('span', { class: 'lb' }, d.label), h('span', { class: 'st' }, st ? st[1] : d.recordable ? '·' : '—'));
  }));

  const drills = todayItems.filter((m) => m.type === 'skill' || m.type === 'interval');
  return h('div', { class: 'card hud', 'data-testid': 'mission-card' },
    h('div', { class: 'spread' }, label('PT MISSION'), state.missions[date]?.status === 'done' && stamp()),
    h('div', { class: 'muted small' }, '체력단련 중엔 폰을 못 쓰니 전날 저녁에 확인하고, 끝난 뒤 결과만 기록하세요. 업힐 2.8km는 기록하지 않습니다.'),

    h('div', { class: 'pt-sec' }, label(`TODAY · ${shortDate(date)}`),
      todayItems.map(ptLine).filter(Boolean).map((t) => h('div', { class: 'pt-line' }, t))),
    h('div', { class: 'pt-sec' },
      h('div', { class: 'spread' }, label(sel === date ? 'RESULT' : `RESULT · ${shortDate(sel)}`),
        sel !== date && h('button', { class: 'btn sm ghost', onclick: () => { ptDay = null; rerender(); } }, '오늘로')),
      record),

    h('div', { class: 'pt-sec', 'data-testid': 'pt-tomorrow' }, label(`TOMORROW · ${shortDate(tomorrow)}`),
      tomorrowItems.map((m) => ptBrief(m, r.rank)).filter(Boolean)),

    h('div', { class: 'pt-sec' },
      h('div', { class: 'spread' }, label('THIS WEEK'), h('span', { class: 'muted small mono', 'data-testid': 'pt-summary' },
        `완료 ${week.done} · 일부 ${week.partial} · 못함 ${week.skip} / ${week.required}일`)),
      strip),

    drills.length > 0 && h('div', { class: 'row wrap pt-sec' }, h('span', { class: 'muted small' }, '폰을 쓸 수 있을 때만:'),
      drills.map((m) => m.type === 'skill'
        ? h('button', { class: 'btn sm', 'data-testid': 'skill-start', onclick: () => go('#skill') }, state.drill?.type === 'skill' ? '스킬 가이드 이어서' : '스킬 가이드')
        : h('button', { class: 'btn sm', 'data-testid': 'interval-start', onclick: () => go('#interval') }, '인터벌 코치'))));
}

function weekCard(date) {
  const done = weekDone(state.sessions, date);
  const mon = mondayOf(date);
  const sched = scheduleFor(date);
  const skip = reschedOf(date)?.applied?.skip ?? [];
  return h('div', { class: 'card' },
    h('div', { class: 'spread' }, label('THIS WEEK'), h('span', { class: 'muted small mono' }, `${done.size}/4`)),
    h('div', { class: 'week4', style: 'margin-top:8px', 'data-testid': 'week4' },
      P.SESSION_ORDER.map((k) => {
        const d = Object.keys(sched).find((x) => sched[x] === k) ?? addDays(mon, P.SESSIONS[k].dow - 1);
        const when = done.has(k) ? '완료' : skip.includes(k) ? '생략' : shortDate(d).replace(/^\d+\//, '');
        return h('div', { class: `${done.has(k) ? 'done' : ''}${d === date && !skip.includes(k) ? ' today' : ''}` },
          h('span', { class: 'en' }, P.SESSIONS[k].code), P.SESSIONS[k].name, h('div', { class: 'small' }, when));
      })));
}

export function renderToday(root) {
  const date = today();
  const wi = weekInfo(date);
  mount(root,
    h('div', { class: 'spread', style: 'margin:4px 2px 10px' },
      h('div', null, label('TODAY'), h('div', { style: 'font-size:20px;font-weight:700' }, `금일 임무 · ${shortDate(date)}`)),
      wi.before ? h('span', { class: 'badge amber' }, `작전 개시 D-${wi.before}`) : h('span', { class: 'badge' }, `WEEK ${wi.week}`)),
    testDayCard(date),
    sessionCard(date, wi),
    reschedCard(date),
    missionCard(date),
    weekCard(date));
}
