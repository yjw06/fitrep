// 체력 검정 2분 모드: 3·2·1 → 30초마다 "목표 누적 N개" → 종료 비프 → 결과 입력
import { h, mount, label, stepper, toast, $ } from './dom.js';
import { state, save } from '../store.js';
import { fmtClock } from '../logic/dates.js';
import { ptPhase, cumulativeTarget, cuePoints, upsertTest } from '../logic/pttest.js';
import { latestTestValues } from '../logic/missions.js';
import { uid } from '../logic/schema.js';
import { P, today } from './common.js';
import { unlockAudio, beep, speak, keepAwake } from './fx.js';
import { go, rerender } from './nav.js';

export function startPtTest(item) {
  unlockAudio();
  const goal = state.settings.goals[item] ?? latestTestValues(state.tests)[item] ?? null;
  state.drill = { type: 'pttest', item, goal, startAt: Date.now(), countdown: P.PT_TEST.countdown, sec: P.PT_TEST.sec, fired: [] };
  save();
  go('#pttest');
}

let shownPhase = null;

export function renderPtTest(root) {
  const d = state.drill;
  if (d?.type !== 'pttest') return go('#test');
  keepAwake(true);
  const ph = ptPhase(d, Date.now());
  shownPhase = ph.phase;
  const title = P.PT_TEST.items[d.item];
  const cancel = h('button', { class: 'btn danger block', style: 'margin-top:10px', onclick: () => {
    if (!confirm('2분 모드를 중단할까요?')) return;
    state.drill = null; save(); go('#test');
  } }, '중단');

  if (ph.phase === 'done') {
    let v = d.goal ?? 0;
    mount(root,
      h('div', { class: 'card hud active-card', 'data-testid': 'pt-result' },
        label('TIME UP'),
        h('h2', null, `${title} — 결과 입력`),
        stepper({ value: v, step: 1, min: 0, max: 300, label: '개수', testid: 'pt-count', onChange: (x) => { v = x; } }),
        d.goal && h('div', { class: 'muted small', style: 'margin-top:6px' }, `목표 ${d.goal}개`),
        h('button', { class: 'btn primary block big', style: 'margin-top:12px', 'data-testid': 'pt-save', onclick: () => {
          state.tests = upsertTest(state.tests, today(), { [d.item]: v, mode: 'timed' }, uid);
          state.drill = null; save(); toast('검정 기록 저장 — 60% 재계산'); go('#test');
        } }, '기록 저장')),
      cancel);
    return;
  }
  mount(root,
    h('div', { class: 'card hud active-card', 'data-testid': 'pt-run' },
      label(ph.phase === 'countdown' ? 'STAND BY' : 'TWO-MINUTE DRILL'),
      h('h2', null, title),
      h('div', { class: 'bigclock', id: 'pt-clock' }, ph.phase === 'countdown' ? ph.countdownLeft : fmtClock(ph.left)),
      h('div', { class: 'cue-target' }, h('div', { class: 'label' }, 'TARGET PACE'), h('div', { class: 'kpi', id: 'pt-target' }, '—'), h('div', { class: 'muted small' }, d.goal ? `목표 ${d.goal}개 기준 누적` : '목표 없음 — 설정에서 입력'))),
    cancel);
  ptTick();
}

export function ptTick() {
  const d = state.drill;
  if (d?.type !== 'pttest') return;
  const now = Date.now();
  const ph = ptPhase(d, now);
  if (ph.phase !== shownPhase) {
    if (ph.phase === 'run') fire(d, 'go', 0, () => { tone({ freq: 1320, dur: 0.3 }); say('시작'); });
    if (ph.phase === 'done') fire(d, 'end', (now - d.startAt) / 1000 - d.countdown - d.sec, () => { tone({ freq: 1320, dur: 0.6 }); tone({ freq: 880, dur: 0.6, at: 0.7 }); say('종료'); });
    return rerender();
  }
  const clock = $('#pt-clock');
  if (!clock) return;
  if (ph.phase === 'countdown') {
    clock.textContent = ph.countdownLeft;
    fire(d, `c${ph.countdownLeft}`, 0, () => tone({ freq: 880 }));
    return;
  }
  clock.textContent = fmtClock(Math.ceil(ph.left));
  const target = cumulativeTarget(d.goal, ph.elapsed, d.sec);
  $('#pt-target').textContent = target ?? '—';
  for (const t of cuePoints(d.sec, P.PT_TEST.cueEvery)) {
    if (ph.elapsed >= t) {
      const n = cumulativeTarget(d.goal, t, d.sec);
      fire(d, `t${t}`, ph.elapsed - t, () => say(n != null ? `목표 누적 ${n}개` : `${t}초`));
    }
  }
}

// 한 번만 울림. 3초 넘게 지난 큐(앱 복귀)는 조용히 넘김
function fire(d, key, late, fn) {
  if (d.fired.includes(key)) return;
  d.fired.push(key);
  save();
  if (late <= 3) fn();
}
const tone = (o) => { if (state.settings.sound) beep(o); };
const say = (t) => { if (state.settings.voice) speak(t); };
