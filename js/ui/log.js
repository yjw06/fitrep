// 일지: 날짜별 세션(세트 수정·삭제) + 종목별 최근 기록·그래프
import { h, mount, label, stepper, rirPicker, stamp, toast } from './dom.js';
import { state, save } from '../store.js';
import { shortDate, fmtClock } from '../logic/dates.js';
import { exerciseHistory, loggedExercises } from '../logic/stats.js';
import { fmtKg } from '../logic/num.js';
import { exOf, exName, usesWeight, setText, sessionDef } from './common.js';
import { lineChart } from './chart.js';
import { rerender } from './nav.js';

const ui = { mode: 'date', open: null, ex: null };

function editSet(entry, k) {
  const ex = exOf(entry.ex);
  const s = { ...entry.sets[k] };
  const dlg = h('dialog', { class: 'sheet' },
    label(`EDIT · SET ${k + 1}`),
    h('h3', null, exName(entry.ex)),
    h('div', { class: 'stack' },
      usesWeight(ex) && stepper({ value: s.w, step: 2.5, min: 0, max: 500, unit: 'kg', label: '무게', onChange: (v) => { s.w = v; } }),
      stepper({ value: s.reps, step: 1, min: 0, max: 100, label: '반복', onChange: (v) => { s.reps = v; } }),
      ['main', 'accessory', 'assist'].includes(ex.kind) && rirPicker(s.rir ?? null, (v) => { s.rir = v; }),
      h('div', { class: 'grid2' },
        h('button', { class: 'btn', onclick: () => dlg.close() }, '취소'),
        h('button', { class: 'btn primary', onclick: () => { entry.sets[k] = s; save(); dlg.close(); rerender(); } }, '저장'))));
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
}

function sessionCard(rec) {
  const def = sessionDef(rec.key);
  const open = ui.open === rec.id;
  const sets = rec.entries.reduce((a, e) => a + e.sets.length, 0);
  const head = h('div', { class: 'log-day', onclick: () => { ui.open = open ? null : rec.id; rerender(); } },
    h('div', { class: 'spread' }, label(`${def.code} · WEEK ${rec.week}`), h('div', { class: 'row' }, stamp(), h('span', { class: 'muted small num' }, open ? '▲' : '▼'))),
    h('div', { style: 'font-weight:700' }, `${shortDate(rec.date)} ${def.name}`),
    h('div', { class: 'muted small' }, `${sets}세트 · ${fmtClock((rec.endedAt - rec.startedAt) / 1000)}${rec.deload ? ' · 정비 주간' : ''}`));
  if (!open) return h('div', { class: 'card hud' }, head);
  return h('div', { class: 'card hud' },
    head,
    rec.entries.filter((e) => e.sets.length).map((e) => {
      const ex = exOf(e.ex);
      return h('div', { class: 'log-ex' }, h('b', null, exName(e.ex)),
        e.sets.map((s, k) => h('div', { class: 'log-set' },
          h('span', { class: 'label' }, `S${k + 1}`), h('span', null, setText(s, ex)),
          h('button', { class: 'btn sm', onclick: () => editSet(e, k) }, '수정'),
          h('button', { class: 'btn sm danger', onclick: () => {
            if (!confirm('이 세트를 삭제할까요?')) return;
            e.sets.splice(k, 1); save(); rerender();
          } }, '삭제'))));
    }),
    h('p', { class: 'muted small' }, '기록을 고쳐도 이미 정해진 다음 목표는 바뀌지 않습니다(필요하면 다음 세션에서 무게를 조정하세요).'),
    h('button', { class: 'btn danger block', onclick: () => {
      if (!confirm('이 세션 전체를 삭제할까요?')) return;
      state.sessions = state.sessions.filter((s) => s.id !== rec.id);
      save(); toast('삭제했습니다'); rerender();
    } }, '세션 삭제'));
}

function byDate() {
  const list = [...state.sessions].sort((a, b) => (a.date === b.date ? b.startedAt - a.startedAt : a.date < b.date ? 1 : -1));
  if (!list.length) return h('div', { class: 'card' }, h('p', { class: 'muted' }, '아직 기록이 없습니다.'));
  return list.map(sessionCard);
}

function byExercise() {
  const ids = loggedExercises(state.sessions);
  if (!ids.length) return h('div', { class: 'card' }, h('p', { class: 'muted' }, '아직 기록이 없습니다.'));
  if (!ids.includes(ui.ex)) ui.ex = ids[0];
  const ex = exOf(ui.ex);
  const hist = exerciseHistory(state.sessions, ui.ex, ex.kind);
  const weighted = usesWeight(ex);
  const pts = hist.map((x) => ({ y: weighted ? x.top.w : x.totalReps, label: x.date.slice(5).replace('-', '/') }));
  return [
    h('label', { class: 'field' }, h('span', null, '종목'),
      h('select', { 'data-testid': 'ex-select', onchange: (e) => { ui.ex = e.target.value; rerender(); } },
        ids.map((id) => h('option', { value: id, selected: id === ui.ex }, exName(id))))),
    h('div', { class: 'card hud' },
      label(weighted ? (ex.kind === 'assist' ? 'ASSIST WEIGHT' : 'TOP SET') : 'TOTAL REPS'),
      lineChart(pts.slice(-20), { unit: weighted ? 'kg' : '회' }),
      state.targets[ui.ex] && h('div', { class: 'small', style: 'margin-top:6px' }, `다음 목표 ${fmtKg(state.targets[ui.ex].weight)}kg — ${state.targets[ui.ex].reason}`)),
    h('div', { class: 'card' },
      label('RECENT'),
      h('table', { class: 'hist' },
        h('thead', null, h('tr', null, h('th', null, 'DATE'), h('th', null, 'TOP'), h('th', null, 'SETS'))),
        h('tbody', null, [...hist].reverse().slice(0, 12).map((x) => h('tr', null,
          h('td', null, shortDate(x.date)), h('td', null, setText(x.top, ex)),
          h('td', { class: 'small' }, x.sets.map((s) => (weighted ? `${fmtKg(s.w)}×${s.reps}` : s.reps)).join(' · '))))))),
  ];
}

export function renderLog(root) {
  const seg = (mode, text) => h('button', { class: `chip${ui.mode === mode ? ' on' : ''}`, onclick: () => { ui.mode = mode; rerender(); } }, text);
  mount(root,
    h('div', { style: 'margin:4px 2px 10px' }, label('LOGBOOK'), h('div', { style: 'font-size:20px;font-weight:700' }, '일지')),
    h('div', { class: 'chips', style: 'grid-template-columns:1fr 1fr;margin-bottom:12px' }, seg('date', '날짜별'), seg('ex', '종목별')),
    ui.mode === 'date' ? byDate() : byExercise());
}
