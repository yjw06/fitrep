// 작전 재편성: 오늘 패스(사유) → 남은 요일 재배치안 최대 3개 → 적용
import { h, label, toast } from './dom.js';
import { state, save } from '../store.js';
import { mondayOf, addDays, shortDate, dowKo, dowOf } from '../logic/dates.js';
import { proposals } from '../logic/reschedule.js';
import { P, today } from './common.js';
import { rerender } from './nav.js';

function weekRec(date) {
  const mon = mondayOf(date);
  state.reschedule[mon] ??= { passes: [], applied: null };
  return state.reschedule[mon];
}

export function passDialog(date, key) {
  const dlg = h('dialog', { class: 'sheet', 'data-testid': 'pass-dialog' },
    label('PASS'),
    h('h3', null, `오늘 ${P.SESSIONS[key].name} 패스`),
    h('p', { class: 'muted small' }, '사유를 고르면 남은 요일로 작전 재편성안을 만듭니다.'),
    h('div', { class: 'qadd' }, P.PASS_REASONS.map((reason) => h('button', { class: 'btn', onclick: () => {
      const rec = weekRec(date);
      rec.passes = [...rec.passes.filter((p) => p.date !== date), { date, key, reason, at: Date.now() }];
      save(); dlg.close(); rerender();
    } }, reason))),
    h('button', { class: 'btn ghost block', style: 'margin-top:8px', onclick: () => dlg.close() }, '취소'));
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
}

export function cancelPass(date) {
  const rec = state.reschedule[mondayOf(date)];
  if (!rec) return;
  rec.passes = rec.passes.filter((p) => p.date !== date);
  if (rec.applied?.from === date) rec.applied = null;
  save();
}

function daysGrid(mon, assign, from, date) {
  return h('div', { class: 'plan-days' }, Array.from({ length: 7 }, (_, i) => {
    const d = addDays(mon, i);
    const done = state.sessions.find((s) => s.date === d);
    const key = d < from ? (done?.key ?? null) : assign[d] ?? null;
    const moved = d >= from && key && P.WEEK_PLAN[i + 1] !== key;
    return h('div', { class: `${key ? 'has' : ''}${moved ? ' moved' : ''}${d < date ? ' past' : ''}` },
      h('div', null, dowKo(i + 1)), h('b', null, key ? P.SESSIONS[key].name.replace('상체', '상').replace('하체', '하') : '·'));
  }));
}

export function reschedCard(date) {
  const mon = mondayOf(date);
  const rec = state.reschedule[mon];
  if (!rec?.passes?.length) return null;
  const latest = rec.passes.map((p) => p.date).sort().at(-1);
  const applied = rec.applied;

  if (applied && applied.from >= latest) {
    return h('div', { class: 'card', 'data-testid': 'resched-applied' },
      label('REORGANIZED'),
      h('div', { style: 'font-weight:700' }, '작전 재편성 적용됨'),
      daysGrid(mon, applied.assign, applied.from, date),
      applied.skip.length > 0 && h('div', { class: 'small' }, `이번 주 생략: ${applied.skip.map((k) => P.SESSIONS[k].name).join(', ')}`),
      h('button', { class: 'btn ghost block', style: 'margin-top:8px', onclick: () => { rec.applied = null; save(); rerender(); } }, '재편성안 다시 고르기'));
  }

  const doneWeek = state.sessions.filter((s) => s.date >= mon && s.date <= addDays(mon, 6)).map((s) => ({ key: s.key, date: s.date }));
  const doneKeys = new Set(doneWeek.map((d) => d.key));
  const remaining = P.SESSION_ORDER.filter((k) => !doneKeys.has(k));
  const blocked = [...rec.passes.map((p) => p.date)];
  for (let d = mon; d < today(); d = addDays(d, 1)) blocked.push(d);
  const opts = proposals({ from: latest, done: doneWeek, remaining, gymDays: state.settings.gymDays, sessions: P.SESSIONS, blocked });

  return h('div', { class: 'card hud active-card', 'data-testid': 'resched-card' },
    label('REORGANIZE'),
    h('h3', null, '작전 재편성안'),
    h('p', { class: 'muted small' }, `패스: ${rec.passes.map((p) => `${shortDate(p.date)} ${p.reason}`).join(' · ')} · 남은 세션 ${remaining.length}개 · 가능 요일 ${state.settings.gymDays.map(dowKo).join('')}`),
    opts.length ? opts.map((o, i) => h('div', { class: 'plan-opt', 'data-testid': `resched-opt-${i}` },
      h('div', { class: 'spread' }, h('b', null, `안 ${i + 1}`), h('span', { class: 'muted small' }, o.cost ? `원래 일정과 ${o.cost}일 차이` : '원래 일정 유지')),
      daysGrid(mon, o.assign, latest, date),
      o.skip.length > 0 && h('div', { class: 'small', style: 'color:var(--alert)' }, `생략 제안: ${o.skip.map((k) => P.SESSIONS[k].name).join(', ')}`),
      h('button', { class: 'btn od block', 'data-testid': `resched-apply-${i}`, onclick: () => {
        rec.applied = { from: latest, assign: o.assign, skip: o.skip, at: Date.now() };
        save(); toast('작전 재편성 적용'); rerender();
      } }, '이 안으로 재편성')))
      : h('p', null, '남은 요일에 넣을 수 있는 세션이 없습니다.'),
    h('div', { class: 'muted small', style: 'margin-top:6px' }, `규칙: 하루 1세션 · 상체끼리·하체끼리 48시간 · 하체A·B 연달아 금지 (${dowKo(dowOf(latest))}요일 이후)`));
}
