// 금일 임무: 측정일 카드 + 세션 카드(요일 배치, 수동 선택 + 규칙 경고) + 이번 주 진행
import { h, mount, label, stamp } from './dom.js';
import { state } from '../store.js';
import { dowOf, shortDate, addDays, mondayOf } from '../logic/dates.js';
import { testAnchor, isTestDay } from '../logic/pttest.js';
import { pickWarnings } from '../logic/schedule.js';
import { weekDone } from '../logic/stats.js';
import { P, today, weekInfo, exName, prescText, planFor, pullupStage, sessionDef } from './common.js';
import { startSession } from './session.js';
import { rerender, go } from './nav.js';

let picked = null; // 수동 선택한 세션(오늘 날짜 한정)

function sessionCard(date, wi) {
  if (state.active) {
    return h('div', { class: 'card hud active-card' },
      label('MISSION IN PROGRESS'),
      h('h2', null, `${sessionDef(state.active.key).name} — 작전 진행 중`),
      h('button', { class: 'btn primary block big', onclick: () => go('#session') }, '작전 복귀'));
  }
  const planned = P.WEEK_PLAN[dowOf(date)] ?? null;
  if (picked && picked.date !== date) picked = null;
  const key = picked?.key ?? planned;

  const chips = h('div', { class: 'chips', style: `grid-template-columns:repeat(${P.SESSION_ORDER.length},1fr)`, role: 'group', 'aria-label': '세션 선택' },
    P.SESSION_ORDER.map((k) => h('button', {
      type: 'button', class: `chip${k === key ? ' on' : ''}`, 'data-testid': `pick-${k}`,
      onclick: () => { picked = { date, key: k === key && picked?.key ? null : k }; rerender(); },
    }, h('span', { class: 'en' }, P.SESSIONS[k].code), P.SESSIONS[k].short)));

  if (!key) {
    return h('div', { class: 'card hud', 'data-testid': 'session-card' },
      label('MISSION'),
      h('h2', null, '휴식'),
      h('p', { class: 'muted small' }, '오늘은 헬스 세션이 없습니다. 요일을 바꿔 하려면 아래에서 세션을 고르세요.'),
      chips);
  }

  const def = P.SESSIONS[key];
  const plan = planFor(key, wi);
  const done = state.sessions.some((s) => s.date === date && s.key === key);
  const warns = done ? [] : pickWarnings({ key, date, sessions: state.sessions, defs: P.SESSIONS });
  const r = pullupStage();
  return h('div', { class: 'card hud', 'data-testid': 'session-card' },
    h('div', { class: 'spread' }, label(`MISSION · ${def.code}`), done && stamp()),
    h('h2', null, def.name),
    h('div', { class: 'row wrap' },
      h('span', { class: 'badge' }, `WEEK ${wi.week}`),
      h('span', { class: 'badge' }, `약 ${def.minutes}분`),
      wi.deload && h('span', { class: 'badge amber' }, '정비 주간 · 세트 절반'),
      wi.week === 1 && h('span', { class: 'badge' }, '탐색 주 · RIR 3'),
      picked?.key && planned !== key && h('span', { class: 'badge od' }, '수동 선택')),
    def.notes.length > 0 && h('div', { class: 'muted small', style: 'margin-top:6px' }, def.notes.map((n) => h('div', null, `· ${n}`))),
    h('ol', { class: 'small', style: 'padding-left:20px;margin:10px 0' },
      plan.slots.map((slot) => {
        const es = plan.entries.filter((e) => e.slotId === slot.id);
        const isPull = def.slots.find((s) => s.id === slot.id)?.pullupSlot;
        return h('li', null, es.map((e, i) => [i ? ' → ' : '', exName(e.ex), h('span', { class: 'muted' }, ` ${prescText(e.presc)}`)]),
          isPull && h('span', { class: 'badge', style: 'margin-left:6px' }, `턱걸이 ${r.stage.stage}단계`),
          es.length > 1 && h('span', { class: 'ss-tag' }, ' SUPERSET'));
      })),
    warns.length > 0 && h('div', { class: 'warn', 'data-testid': 'pick-warn' }, warns.map((w) => h('div', null, `⚠ ${w}`))),
    chips,
    h('div', { style: 'height:10px' }),
    h('button', { class: 'btn primary block big', 'data-testid': 'start', onclick: () => startSession(key) },
      h('span', { class: 'en' }, 'EXECUTE'), done ? ' 한 번 더 작전 개시' : ' 작전 개시'));
}

// 격주 일요일: 정자세 턱걸이 최대 측정
function testDayCard(date) {
  if (!isTestDay(date, testAnchor(state.settings))) return null;
  const done = state.tests.some((t) => t.date === date && t.pullups != null);
  return h('div', { class: 'card hud active-card', 'data-testid': 'testday-card' },
    h('div', { class: 'spread' }, label('PULL-UP TEST'), done && stamp()),
    h('h2', null, '턱걸이 측정일'),
    h('p', { class: 'muted small' }, '정자세 턱걸이 최대 개수를 재서 로드맵 단계를 정합니다. 체력검정 준비 중이면 팔굽·윗몸 2분도 같이.'),
    h('button', { class: 'btn primary block big', onclick: () => go('#test') }, done ? '측정 기록 보기' : '측정 기록하기'));
}

function weekCard(date) {
  const done = weekDone(state.sessions, date);
  const mon = mondayOf(date);
  return h('div', { class: 'card' },
    h('div', { class: 'spread' }, label('THIS WEEK'), h('span', { class: 'muted small mono' }, `${P.SESSION_ORDER.filter((k) => done.has(k)).length}/${P.SESSION_ORDER.length}`)),
    h('div', { class: 'week-cells', style: `margin-top:8px;grid-template-columns:repeat(${P.SESSION_ORDER.length},1fr)`, 'data-testid': 'week-cells' },
      P.SESSION_ORDER.map((k) => {
        const d = addDays(mon, P.SESSIONS[k].dow - 1);
        return h('div', { class: `${done.has(k) ? 'done' : ''}${d === date ? ' today' : ''}` },
          h('span', { class: 'en' }, P.SESSIONS[k].code), P.SESSIONS[k].short,
          h('div', { class: 'small' }, done.has(k) ? '완료' : shortDate(d).replace(/^\d+\//, '')));
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
    weekCard(date));
}
