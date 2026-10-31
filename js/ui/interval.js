// 400m 인터벌 코치: 달리기(200m 예상 시점 음성) → 랩 탭 → 90초 걷기 카운트다운 ×6, 랩 기록 저장
import { h, mount, label, toast, $ } from './dom.js';
import { state, save } from '../store.js';
import { fmtClock } from '../logic/dates.js';
import { intervalPace } from '../logic/missions.js';
import { startInterval, lapInterval, advanceInterval, intervalView, lapSummary } from '../logic/interval.js';
import { P, today } from './common.js';
import { unlockAudio, beep, speak, keepAwake } from './fx.js';
import { go, rerender } from './nav.js';

const pace = () => intervalPace(state.settings.goals.run3kSec, P.INTERVAL.divisor);
const fmtLap = (s) => (s >= 60 ? fmtClock(Math.round(s)) : `${s.toFixed(1)}초`);

function saveLaps(d) {
  if (!d.laps.length || d.saved) return;
  state.intervals.push({ date: today(), pace: d.pace, laps: d.laps, at: Date.now() });
  d.saved = true;
}

function lapTable(d) {
  const sum = lapSummary(d.laps, d.pace);
  if (!sum) return null;
  return [
    h('table', { class: 'laps', 'data-testid': 'laps' }, h('tbody', null, d.laps.map((l, i) => {
      const diff = sum.diffs[i];
      return h('tr', null, h('td', null, `#${i + 1}`), h('td', null, fmtClock(Math.round(l))),
        h('td', { class: diff > 0 ? 'slow' : 'fast' }, diff == null ? '' : `${diff > 0 ? '+' : ''}${diff}초`));
    }))),
    h('div', { class: 'small muted', style: 'margin-top:6px' }, `평균 ${fmtClock(Math.round(sum.avg))} · 최고 ${fmtClock(Math.round(sum.best))}`),
  ];
}

export function renderInterval(root) {
  if (state.drill && state.drill.type !== 'interval') return go('#today');
  const d = state.drill;
  const p = pace();
  if (!d) {
    const last = state.intervals.at(-1);
    mount(root,
      h('div', { style: 'margin:4px 2px 10px' }, label('INTERVAL'), h('div', { style: 'font-size:20px;font-weight:700' }, '400m 인터벌 코치')),
      h('div', { class: 'card hud' },
        label('TARGET PACE'),
        h('div', { class: 'bigclock' }, p ? fmtClock(p) : '—'),
        h('div', { class: 'drill-sub muted' }, `400m × ${P.INTERVAL.reps} · 사이 ${P.INTERVAL.walkSec}초 걷기 · 3km 목표 ÷ 7.5`),
        h('button', { class: 'btn primary block big', style: 'margin-top:12px', disabled: !p, 'data-testid': 'iv-go', onclick: () => {
          unlockAudio();
          state.drill = startInterval({ pace: p, reps: P.INTERVAL.reps, walkSec: P.INTERVAL.walkSec, cueAt: P.INTERVAL.cueAt }, Date.now());
          save(); if (state.settings.sound) beep({ freq: 1320, dur: 0.3 }); rerender();
        } }, h('span', { class: 'en' }, 'GO'), ' 출발'),
        !p && h('p', { class: 'muted small' }, '설정에서 3km 목표를 입력하세요.')),
      last && h('div', { class: 'card' }, label(`LAST · ${last.date}`), lapTable(last)),
      h('button', { class: 'btn block', onclick: () => go('#today') }, '임무로'));
    return;
  }
  keepAwake(true);
  const v = intervalView(d, Date.now());
  const head = h('div', { class: 'spread', style: 'margin:4px 2px 10px' },
    h('div', null, label('INTERVAL'), h('div', { style: 'font-size:20px;font-weight:700' }, d.phase === 'done' ? '인터벌 완료' : `${d.rep + 1} / ${d.reps}회`)),
    h('span', { class: 'badge' }, `목표 ${fmtClock(d.pace)}`));

  if (d.phase === 'done') {
    saveLaps(d); save();
    mount(root, head, h('div', { class: 'card hud' }, label('LAPS'), lapTable(d)),
      h('button', { class: 'btn primary block big', 'data-testid': 'iv-close', onclick: () => { state.drill = null; save(); go('#today'); } }, '닫기'));
    return;
  }
  const run = d.phase === 'run';
  mount(root, head,
    h('div', { class: 'card hud active-card', 'data-testid': 'iv-card' },
      label(run ? 'RUN' : 'WALK'),
      h('div', { class: `bigclock${run ? '' : ' walk'}`, id: 'iv-clock' }, fmtClock(run ? v.elapsed : v.walkLeft)),
      h('div', { class: 'drill-sub' }, run ? `200m 예상 ${fmtClock(d.pace * d.cueAt)} · 목표 ${fmtClock(d.pace)}` : `걷기 — 다음 ${d.rep + 2}회차`),
      run
        ? h('button', { class: 'btn primary block big', style: 'min-height:96px;font-size:24px;margin-top:12px', 'data-testid': 'iv-lap', onclick: () => {
          state.drill = lapInterval(d, Date.now());
          if (state.settings.sound) beep({ freq: 1320, dur: 0.2 });
          const lap = state.drill.laps.at(-1);
          if (state.settings.voice) speak(`${Math.round(lap)}초`);
          save(); rerender();
        } }, h('span', { class: 'en' }, 'LAP'), ' 랩')
        : h('button', { class: 'btn od block', style: 'margin-top:12px', 'data-testid': 'iv-skipwalk', onclick: () => {
          state.drill = advanceInterval({ ...d, phaseStart: Date.now() - d.walkSec * 1000 }, Date.now());
          save(); rerender();
        } }, '걷기 건너뛰고 출발')),
    d.laps.length > 0 && h('div', { class: 'card' }, label('LAPS'), lapTable(d)),
    h('button', { class: 'btn danger block', onclick: () => {
      if (!confirm('인터벌을 중단할까요? 지금까지 랩은 저장됩니다.')) return;
      saveLaps(d); state.drill = null; save(); toast(d.laps.length ? '랩 기록 저장' : '중단'); go('#today');
    } }, '중단'));
  ivTick();
}

export function ivTick() {
  const d = state.drill;
  if (d?.type !== 'interval' || d.phase === 'done') return;
  const now = Date.now();
  const next = advanceInterval(d, now);
  if (next !== d) {
    const late = (now - next.phaseStart) / 1000;
    state.drill = next; save();
    if (late < 3) { if (state.settings.sound) beep({ freq: 1320, dur: 0.4 }); if (state.settings.voice) speak('출발'); }
    return rerender();
  }
  const v = intervalView(d, now);
  const clock = $('#iv-clock');
  if (clock) clock.textContent = fmtClock(d.phase === 'run' ? v.elapsed : Math.ceil(v.walkLeft));
  if (v.halfwayDue) {
    d.cued = true; save();
    if (v.elapsed - d.pace * d.cueAt < 3 && state.settings.voice) speak('200미터');
  }
  if (d.phase === 'walk') {
    const s = Math.ceil(v.walkLeft);
    if (s <= 3 && s > 0 && d.lastBeep !== s) { d.lastBeep = s; if (state.settings.sound) beep({ freq: 880 }); }
  }
}
