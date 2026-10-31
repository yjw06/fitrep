// 스킬 데이 가이드: 계급별 순서 진행, 탑 홀드·데드행 스톱워치
import { h, mount, label, toast, $ } from './dom.js';
import { state, save } from '../store.js';
import { fmtClock } from '../logic/dates.js';
import { skillPlan, skillSets, skillDose } from '../logic/rank.js';
import { P, today, pullupRank, insignia } from './common.js';
import { unlockAudio, beep, speak, keepAwake } from './fx.js';
import { go, rerender } from './nav.js';

function ensureDrill() {
  if (state.drill?.type === 'skill') return state.drill;
  const r = pullupRank();
  state.drill = {
    type: 'skill', date: today(), rank: r.rank.name, rankIdx: r.idx,
    sets: skillSets(skillPlan(r.idx, P)).map((s) => ({ ...s, done: false, sec: null })),
    holdStart: null, goalCued: false,
  };
  save();
  return state.drill;
}

function finish(d) {
  state.skillLogs.push({ date: d.date, rank: d.rank, sets: d.sets.filter((s) => s.done).map(({ label: l, reps, sec, name }) => ({ name, label: l, reps, sec })) });
  state.missions[d.date] ??= { status: 'done', at: Date.now() };
  state.drill = null;
  save();
  toast('스킬 데이 기록 저장');
  go('#today');
}

export function renderSkill(root) {
  if (state.drill && state.drill.type !== 'skill') return go('#today');
  const d = ensureDrill();
  keepAwake(true);
  const cur = d.sets.findIndex((s) => !s.done);
  const plan = skillPlan(d.rankIdx, P);
  const bestHang = Math.max(0, ...state.skillLogs.flatMap((l) => l.sets.filter((s) => s.name === '데드행').map((s) => s.sec ?? 0)));

  const rows = d.sets.map((s, i) => {
    const isCur = i === cur;
    let act = null;
    if (isCur && s.hold) {
      act = d.holdStart
        ? h('button', { class: 'btn primary', 'data-testid': 'hold-stop', onclick: () => {
          s.sec = Math.round((Date.now() - d.holdStart) / 100) / 10; s.done = true; d.holdStart = null; d.goalCued = false; save(); rerender();
        } }, '종료 ', h('span', { class: 'num', id: 'sk-watch' }, '0.0'))
        : h('button', { class: 'btn od', 'data-testid': 'hold-start', onclick: () => { unlockAudio(); d.holdStart = Date.now(); save(); rerender(); } }, '버티기 시작');
    } else if (isCur) {
      act = h('button', { class: 'btn od', 'data-testid': 'skill-done', onclick: () => { s.done = true; save(); rerender(); } }, '완료');
    } else if (s.done) {
      act = h('span', { class: 'num small' }, s.sec != null ? `${s.sec}초` : '✓');
    }
    return h('div', { class: `skill-set${isCur ? ' cur' : ''}${s.done ? ' ok' : ''}` },
      h('div', null, h('b', null, s.name), h('div', { class: 'small' }, s.label, s.goalSec ? ` · 목표 ${s.goalSec}초` : '')), act);
  });

  mount(root,
    h('div', { class: 'spread', style: 'margin:4px 2px 10px' },
      h('div', null, label('SKILL DAY'), h('div', { style: 'font-size:20px;font-weight:700' }, '턱걸이 스킬 10분')),
      h('span', { class: 'badge' }, insignia(P.PULLUP_RANKS[d.rankIdx].bars, 14), d.rank)),
    h('div', { class: 'card' }, label('ORDER'),
      h('ol', { class: 'small', style: 'padding-left:20px;margin:6px 0' }, plan.map((s) => h('li', null, h('b', null, `${s.name} ${skillDose(s)}`), h('span', { class: 'muted' }, ` — ${s.cue}`)))),
      h('div', { class: 'muted small' }, `실패 전에 멈춤${bestHang ? ` · 데드행 최고 ${bestHang}초` : ''}`)),
    h('div', { class: 'card hud active-card', 'data-testid': 'skill-card' }, rows),
    h('div', { class: 'grid2' },
      h('button', { class: 'btn danger', onclick: () => { if (confirm('기록 없이 스킬 가이드를 닫을까요?')) { state.drill = null; save(); go('#today'); } } }, '취소'),
      h('button', { class: `btn ${cur < 0 ? 'primary' : 'od'}`, 'data-testid': 'skill-finish', onclick: () => finish(d) }, cur < 0 ? '완료 · 저장' : '여기까지 저장')));
  skillTick();
}

export function skillTick() {
  const d = state.drill;
  if (d?.type !== 'skill' || !d.holdStart) return;
  const sec = (Date.now() - d.holdStart) / 1000;
  const w = $('#sk-watch');
  if (w) w.textContent = sec < 60 ? sec.toFixed(1) : fmtClock(sec);
  const s = d.sets.find((x) => !x.done);
  if (s?.goalSec && sec >= s.goalSec && !d.goalCued) {
    d.goalCued = true; save();
    if (state.settings.sound) beep({ freq: 1320, dur: 0.4 });
    if (state.settings.voice) speak(`${s.goalSec}초`);
  }
}
