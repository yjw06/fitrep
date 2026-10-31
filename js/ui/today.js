// 금일 임무: 세션 카드 + 체력단련 미션 + 이번 주 진행 4칸
import { h, mount, label, stamp } from './dom.js';
import { state, save } from '../store.js';
import { dowOf, shortDate, fmtClock, addDays, mondayOf } from '../logic/dates.js';
import { missionsFor } from '../logic/missions.js';
import { weekDone } from '../logic/stats.js';
import { buildPlan } from '../logic/plan.js';
import { P, today, weekInfo, exName, prescText } from './common.js';
import { startSession } from './session.js';
import { rerender, go } from './nav.js';

let picked = null; // 수동 선택한 세션(오늘 날짜 한정)

function planFor(key, wi) {
  return buildPlan(P.SESSIONS[key], {
    week: wi.week, deloadEvery: state.settings.deloadEvery,
    negStage: state.exState.negPullup?.stage ?? 0, negStages: P.NEGATIVE_STAGES,
    alts: state.settings.alts, exercises: P.EXERCISES,
  });
}

function sessionCard(date, wi) {
  const dow = dowOf(date);
  const planned = P.WEEK_PLAN[dow] ?? null;
  if (picked && picked.date !== date) picked = null;
  const key = picked?.key ?? planned;
  const doneToday = state.sessions.filter((s) => s.date === date);

  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': '세션 선택' },
    P.SESSION_ORDER.map((k) => h('button', {
      type: 'button', class: `chip${k === key ? ' on' : ''}`, 'data-testid': `pick-${k}`,
      onclick: () => { picked = { date, key: k === key && !planned ? null : k }; rerender(); },
    }, h('span', { class: 'en' }, P.SESSIONS[k].code), P.SESSIONS[k].name)));

  if (state.active) {
    const a = state.active;
    return h('div', { class: 'card hud active-card' },
      label('MISSION IN PROGRESS'),
      h('h2', null, `${P.SESSIONS[a.key].name} — 작전 진행 중`),
      h('button', { class: 'btn primary block big', onclick: () => go('#session') }, '작전 복귀'));
  }

  if (!key) {
    return h('div', { class: 'card hud' },
      label('MISSION'),
      h('h2', null, '헬스 휴식'),
      h('p', { class: 'muted small' }, '오늘은 헬스 세션이 없습니다. 필요하면 아래에서 세션을 골라 진행하세요.'),
      chips);
  }

  const def = P.SESSIONS[key];
  const plan = planFor(key, wi);
  const done = doneToday.some((s) => s.key === key);
  return h('div', { class: 'card hud', 'data-testid': 'session-card' },
    h('div', { class: 'spread' }, label(`MISSION · ${def.code}`), done && stamp()),
    h('h2', null, `${def.name} — ${def.title}`),
    h('div', { class: 'row wrap' },
      h('span', { class: 'badge' }, `WEEK ${wi.week}`),
      h('span', { class: 'badge' }, `약 ${def.minutes}분`),
      wi.deload && h('span', { class: 'badge amber' }, '정비 주간 · 세트 절반'),
      wi.week === 1 && h('span', { class: 'badge' }, '탐색 주 · RIR 3'),
      picked?.key && planned !== key && h('span', { class: 'badge od' }, '수동 선택')),
    def.note && h('p', { class: 'muted small' }, def.note),
    h('ol', { class: 'small', style: 'padding-left:20px;margin:10px 0' },
      plan.slots.map((slot) => {
        const es = plan.entries.filter((e) => e.slotId === slot.id);
        return h('li', null, es.map((e, i) => [i ? ' → ' : '', exName(e.ex), h('span', { class: 'muted' }, ` ${prescText(e.presc)}`)]),
          es.length > 1 && h('span', { class: 'ss-tag' }, ' SUPERSET'));
      })),
    chips,
    h('div', { style: 'height:10px' }),
    h('button', { class: 'btn primary block big', 'data-testid': 'start', onclick: () => startSession(key) },
      h('span', { class: 'en' }, 'EXECUTE'), done ? ' 한 번 더 작전 개시' : ' 작전 개시'));
}

function missionCard(date) {
  const items = missionsFor(dowOf(date), { tests: state.tests, goals: state.settings.goals, program: P });
  const rec = state.missions[date];
  const body = items.map((m) => {
    let detail;
    if (m.type === 'situp' || m.type === 'pushup') {
      detail = m.missing
        ? h('div', { class: 'muted small' }, '검정 값이 없습니다 — 검정 탭에서 입력하세요')
        : h('div', null, h('span', { class: 'kpi' }, m.reps), h('span', null, ` 개 × ${m.sets}세트`), h('span', { class: 'muted small' }, ` · 휴식 ${m.rest}초 · 최대 ${m.max}의 60%`));
    } else if (m.type === 'skill') {
      detail = [h('div', { class: 'muted small' }, m.sub), h('ol', null, m.steps.map((s) => h('li', null, h('b', null, `${s.name} ${s.dose}`), h('span', { class: 'muted small' }, ` — ${s.cue}`))))];
    } else if (m.type === 'interval') {
      detail = h('div', null, '목표 페이스 ', h('span', { class: 'kpi' }, m.pace ? fmtClock(m.pace) : '—'), h('span', { class: 'muted small' }, ` /400m · 사이 ${m.walk}초 걷기${m.optional ? ' · 선택' : ''}`));
    } else {
      detail = m.sub && h('div', { class: 'muted small' }, m.sub);
    }
    return h('div', { class: 'mission-item' }, h('h3', null, m.title), detail);
  });
  const restDay = items.every((m) => m.type === 'rest' || m.type === 'test' || m.type === 'run');
  return h('div', { class: 'card hud', 'data-testid': 'mission-card' },
    h('div', { class: 'spread' }, label('PT MISSION'), rec?.done && stamp()),
    h('div', { class: 'muted small' }, '체력단련 추가(달리기 후 10~15분) · 업힐 2.8km는 기록하지 않음'),
    body,
    !restDay && h('label', { class: 'check' },
      h('input', { type: 'checkbox', checked: !!rec?.done, 'data-testid': 'mission-done', onchange: (e) => {
        if (e.target.checked) state.missions[date] = { done: true, at: Date.now() };
        else delete state.missions[date];
        save(); rerender();
      } }), '체력단련 미션 완료'));
}

function weekCard(date) {
  const done = weekDone(state.sessions, date);
  const mon = mondayOf(date);
  return h('div', { class: 'card' },
    h('div', { class: 'spread' }, label('THIS WEEK'), h('span', { class: 'muted small mono' }, `${done.size}/4`)),
    h('div', { class: 'week4', style: 'margin-top:8px', 'data-testid': 'week4' },
      P.SESSION_ORDER.map((k) => {
        const d = addDays(mon, P.SESSIONS[k].dow - 1);
        return h('div', { class: `${done.has(k) ? 'done' : ''}${d === date ? ' today' : ''}` },
          h('span', { class: 'en' }, P.SESSIONS[k].code), P.SESSIONS[k].name, h('div', { class: 'small' }, done.has(k) ? '완료' : shortDate(d).replace(/^\d+\//, '')));
      })));
}

export function renderToday(root) {
  const date = today();
  const wi = weekInfo(date);
  mount(root,
    h('div', { class: 'spread', style: 'margin:4px 2px 10px' },
      h('div', null, label('TODAY'), h('div', { style: 'font-size:20px;font-weight:700' }, `금일 임무 · ${shortDate(date)}`)),
      wi.before ? h('span', { class: 'badge amber' }, `작전 개시 D-${wi.before}`) : h('span', { class: 'badge' }, `WEEK ${wi.week}`)),
    sessionCard(date, wi),
    missionCard(date),
    weekCard(date));
}

