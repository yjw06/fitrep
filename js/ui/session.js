// 세션 모드: 기록 · 휴식 타이머 · 워밍업 · 60분 가드 · 종료/판정
import { h, mount, label, stepper, rirPicker, toast, $ } from './dom.js';
import { state, save } from '../store.js';
import { buildSteps, nextStepIndex, isStepDone, remainingSec, guard, trimTarget, effSets } from '../logic/plan.js';
import { judgeExercise, firstWeekBump } from '../logic/progression.js';
import { warmupSets } from '../logic/warmup.js';
import { lastPerformance, judgeHistory } from '../logic/stats.js';
import { fmtClock, seoulTimeStr } from '../logic/dates.js';
import { fmtKg } from '../logic/num.js';
import { uid } from '../logic/schema.js';
import { P, exOf, exName, today, weekInfo, prescText, usesWeight, setText, planFor, sessionDef, weightLabel, slotNo } from './common.js';
import { unlockAudio, beep, speak, keepAwake } from './fx.js';
import { go, rerender } from './nav.js';

// 무게 기본값: 다음 목표 > 지난 기록 > 루틴 시작 무게
function defaultDraft(e) {
  const ex = exOf(e.ex);
  const target = state.targets[e.ex];
  const last = lastPerformance(state.sessions, e.ex, ex.kind);
  return {
    w: usesWeight(ex) ? (target?.weight ?? last?.top?.w ?? ex.start ?? 0) : 0,
    reps: e.presc.reps[1],
    rir: e.presc.rir ? e.presc.rir[0] : null,
  };
}

export function startSession(key) {
  unlockAudio();
  const date = today();
  const wi = weekInfo(date);
  const plan = planFor(key, wi);
  state.active = {
    id: uid(), key, date, week: wi.week, deload: plan.deload, startedAt: Date.now(),
    plan, trim: {}, focus: null, rest: null, warmHidden: {}, warmDone: {},
    draft: plan.entries.map(defaultDraft),
  };
  save();
  go('#session');
}

const slotOf = (a, id) => a.plan.slots.find((s) => s.id === id);

function startRest(a, sec) {
  a.rest = { endsAt: Date.now() + sec * 1000, total: sec, lastBeep: null, ended: false };
}

function completeSet(i) {
  unlockAudio();
  const a = state.active;
  const e = a.plan.entries[i];
  const ex = exOf(e.ex);
  const d = a.draft[i];
  const set = { w: usesWeight(ex) ? d.w : 0, reps: d.reps, rir: d.rir, at: Date.now() };
  e.sets.push(set);
  // 1주차: 3개 넘게 남으면 다음 세트 무게를 올린다(어시스트는 보조를 내린다).
  // 무게가 바뀌었으니 RIR은 목표로 되돌려, 다시 4+를 골라야 또 올라가게
  const bump = firstWeekBump({ week: a.week, exId: e.ex, ex, presc: e.presc, set, settings: state.settings, rule: P.FIRST_WEEK });
  if (bump) Object.assign(d, { w: bump.w, rir: e.presc.rir ? e.presc.rir[0] : null });
  const steps = buildSteps(a.plan, a.trim);
  const st = steps.find((s) => s.entry === i && s.set === e.sets.length - 1);
  const restAfter = st ? st.restAfter : slotOf(a, e.slotId).rest;
  // 같은 슬롯(슈퍼세트 포함)에 남은 세트가 있으면 그 슬롯을 계속, 없으면 기본 순서로
  const sameSlot = steps.find((s) => s.slotId === e.slotId && !isStepDone(a.plan, s));
  a.focus = sameSlot ? sameSlot.entry : null;
  a.rest = null;
  const left = steps.some((s) => !isStepDone(a.plan, s));
  if (restAfter > 0 && left) startRest(a, restAfter);
  if (!left) toast('전 세트 완료 — 작전 종료를 누르세요');
  else if (bump && e.sets.length < effSets(e, a.trim[e.slotId] || 0)) toast(bump.text, 3500);
  save();
  rerender();
  requestAnimationFrame(() => $('.active-card')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
}

function undoSet(i) {
  const a = state.active;
  const e = a.plan.entries[i];
  if (!e.sets.length) return;
  e.sets.pop();
  a.focus = i;
  a.rest = null;
  save();
  rerender();
}

function swapEx(i, exId) {
  const a = state.active;
  const e = a.plan.entries[i];
  if (e.sets.length) return toast('이미 기록한 세트가 있어 바꿀 수 없습니다');
  e.ex = exId;
  e.presc = e.prescs?.[exId] ?? e.presc; // 대체 종목이 자기 처방을 가지면 그 처방으로
  state.settings.alts[`${e.slotId}.${e.itemIdx}`] = exId;
  a.draft[i] = defaultDraft(e);
  save();
  rerender();
}

function warmupBlock(a, i) {
  const box = h('div', { class: 'warm', 'data-testid': 'warmup' });
  const draw = () => {
    const list = warmupSets(a.draft[i].w, state.settings, P.WARMUP_STEPS);
    a.warmDone[i] ??= [];
    mount(box,
      h('div', { class: 'spread' }, label('WARM-UP'), h('button', { class: 'btn sm ghost', onclick: () => { a.warmHidden[i] = true; save(); rerender(); } }, '닫기')),
      list.length ? list.map((w, k) => h('label', { class: 'wline check' },
        h('input', { type: 'checkbox', checked: !!a.warmDone[i][k], onchange: (ev) => { a.warmDone[i][k] = ev.target.checked; save(); } }),
        h('span', null, h('b', { class: 'num' }, `${fmtKg(w.weight)}kg × ${w.reps}`), ` ${w.label}`),
        h('span', { class: 'plates num' }, w.plates.length ? `한쪽 ${w.plates.map(fmtKg).join('+')}` : '빈봉')))
        : h('div', { class: 'muted small' }, '본세트 무게를 정하면 워밍업 단계가 계산됩니다(빈봉 이하 단계는 생략).'));
  };
  draw();
  box.redraw = draw;
  return box;
}

function entryCard(a, i, steps, cur, lastWeek) {
  const e = a.plan.entries[i];
  const ex = exOf(e.ex);
  const slot = slotOf(a, e.slotId);
  const eff = effSets(e, a.trim[e.slotId] || 0);
  const isCur = i === cur;
  const done = e.sets.length >= eff;
  const siblings = a.plan.entries.filter((x) => x.slotId === e.slotId);
  const ssTag = slot.superset ? `SUPERSET ${String.fromCharCode(65 + e.itemIdx)}` : null;
  const last = lastWeek[i];

  const head = h('div', { class: 'ex-head' },
    h('div', { class: 'grow' },
      h('div', { class: 'row wrap' }, label(`${slotNo(e.slotId)}${ssTag ? ` · ${ssTag}` : ''}`), ex.kind === 'main' && h('span', { class: 'badge amber' }, 'MAIN')),
      h('div', { class: 'ex-name' }, exName(e.ex)),
      h('div', { class: 'muted small' }, `${prescText(e.presc)} · 휴식 ${slot.superset && e.itemIdx < siblings.length - 1 ? '없음(→B)' : fmtClock(slot.rest)}`)),
    h('div', { class: 'num', style: 'font-size:15px;white-space:nowrap' }, `${e.sets.length}/${eff}`));

  if (!isCur) {
    return h('div', { class: `card ex${done ? ' done-ex' : ''}`, 'data-testid': `entry-${i}`, onclick: () => { a.focus = i; save(); rerender(); } }, head);
  }

  const d = a.draft[i];
  const lines = [];
  for (let k = 0; k < eff; k++) {
    const s = e.sets[k];
    lines.push(h('div', { class: `setline${s ? ' ok' : ''}${k === e.sets.length ? ' cur' : ''}` },
      h('span', { class: 'label' }, `SET ${k + 1}`),
      h('b', null, s ? setText(s, ex) : k === e.sets.length ? '▶' : '·'),
      h('span', { class: 'prev' }, last?.sets[k] ? `지난 ${setText(last.sets[k], ex)}` : '')));
  }

  const alts = e.options.filter((o) => o !== e.ex);
  let warm = null;
  const inputs = [];
  if (!done) {
    if (ex.warmup && e.sets.length === 0 && !a.warmHidden[i]) warm = warmupBlock(a, i);
    inputs.push(h('div', { class: 'inputs', style: `grid-template-columns:${usesWeight(ex) ? '1fr 1fr' : '1fr'}` },
      usesWeight(ex) && stepper({ value: d.w, step: 2.5, min: 0, max: 500, unit: 'kg', label: weightLabel(ex), testid: 'w',
        onChange: (v) => { d.w = v; save(); warm?.redraw(); } }),
      stepper({ value: d.reps, step: 1, min: 0, max: 100, label: e.presc.perSide ? '반복(한쪽)' : '반복', testid: 'reps', onChange: (v) => { d.reps = v; save(); } })));
    if (['main', 'accessory', 'isolation', 'assist'].includes(ex.kind)) inputs.push(rirPicker(d.rir, (v) => { d.rir = v; save(); }, 'rir'));
    const lastSet = last?.sets[e.sets.length] ?? last?.sets.at(-1);
    inputs.push(h('div', { class: 'grid2' },
      h('button', { class: 'btn', disabled: !lastSet, 'data-testid': 'same', onclick: () => {
        Object.assign(d, { w: lastSet.w ?? d.w, reps: lastSet.reps ?? d.reps, rir: lastSet.rir ?? d.rir });
        save(); rerender();
      } }, '지난번과 동일'),
      h('button', { class: 'btn ghost', disabled: !e.sets.length, onclick: () => undoSet(i) }, '마지막 세트 취소')));
    inputs.push(h('button', { class: 'btn primary block big', 'data-testid': 'complete', onclick: () => completeSet(i) },
      h('span', { class: 'en' }, `SET ${e.sets.length + 1}/${eff}`), ' 세트 완료'));
  } else {
    inputs.push(h('div', { class: 'grid2' },
      h('button', { class: 'btn ghost', onclick: () => undoSet(i) }, '마지막 세트 취소'),
      h('button', { class: 'btn od', onclick: () => { a.focus = null; save(); rerender(); } }, '다음 종목')));
  }

  return h('div', { class: 'card hud active-card ex', 'data-testid': `entry-${i}` },
    head,
    e.presc.note && h('div', { class: 'small', style: 'margin-top:4px' }, `▸ ${e.presc.note}`),
    ex.target && h('div', { class: 'muted small' }, ex.target),
    ex.intensity && h('div', { class: 'muted small' }, `강도 ${ex.intensity.label} — ${ex.intensity.cue}`),
    alts.length > 0 && h('div', { class: 'row wrap', style: 'margin-top:8px' },
      alts.map((alt) => h('button', { class: 'btn sm', disabled: e.sets.length > 0, 'data-testid': 'swap', onclick: () => swapEx(i, alt) }, `대체 ⇄ ${exName(alt)}`))),
    h('div', { class: 'setlist' }, lines),
    warm,
    h('div', { class: 'stack', style: 'margin-top:10px' }, inputs));
}

function guardBox(a, g) {
  const box = h('div', { id: 'guard' });
  if (!g.over) return box;
  const target = trimTarget(a.plan, a.trim);
  const what = target && slotOf(a, target).superset ? '슈퍼세트' : '종목';
  box.append(h('div', { class: 'hazard', 'data-testid': 'guard-alert' },
    label('TIME OVERRUN'),
    h('div', { style: 'font-weight:700;margin:4px 0' }, '작전 시간 초과 예상'),
    h('div', { class: 'small' }, `예상 종료 ${seoulTimeStr(g.etaMs)} · 한도 ${seoulTimeStr(g.limitMs)} (+${Math.ceil(g.overSec / 60)}분)`),
    h('button', { class: 'btn block', style: 'margin-top:10px', disabled: !target, 'data-testid': 'trim', onclick: () => {
      a.trim[target] = (a.trim[target] || 0) + 1;
      save(); rerender();
      toast(`${slotNo(target)}번 ${what} 1세트 감축`);
    } }, target ? `마지막 ${what} 1세트 감축` : '더 줄일 세트 없음')));
  return box;
}

function restPanel(a) {
  if (!a.rest) return null;
  const adj = (sec) => {
    a.rest.endsAt = Math.max(Date.now(), a.rest.endsAt + sec * 1000);
    a.rest.total = Math.max(1, a.rest.total + sec);
    if ((a.rest.endsAt - Date.now()) > 3000) { a.rest.lastBeep = null; a.rest.ended = false; }
    save(); tick();
  };
  return h('div', { class: 'rest', id: 'rest', 'data-testid': 'rest' },
    h('div', { class: 'spread' },
      h('div', null, label('REST', 'rest-label'), h('div', { class: 'clock', id: 'rest-clock' }, '0:00')),
      h('div', { class: 'muted small', id: 'rest-next', style: 'text-align:right;max-width:55%' }, '')),
    h('div', { class: 'bar' }, h('i', { id: 'rest-bar', style: 'width:100%' })),
    h('div', { class: 'ctrl' },
      h('button', { class: 'btn', onclick: () => adj(-15) }, '−15초'),
      h('button', { class: 'btn', onclick: () => adj(15) }, '+15초'),
      h('button', { class: 'btn od', 'data-testid': 'skip-rest', onclick: () => { a.rest = null; save(); rerender(); } }, '건너뛰기')));
}

// 일반 워밍업(5분): 첫 세트 전까지만. 체력단련 직후라면 생략
function generalWarmup(a, def) {
  const gw = P.GENERAL_WARMUP;
  if (!gw || a.gwDone || a.plan.entries.some((e) => e.sets.length)) return null;
  return h('div', { class: 'card', 'data-testid': 'gw-card' },
    h('div', { class: 'spread' }, label(`GENERAL WARM-UP · ${gw.minutes}분`),
      h('button', { class: 'btn sm ghost', 'data-testid': 'gw-done', onclick: () => { a.gwDone = true; save(); rerender(); } }, '완료·닫기')),
    h('div', { style: 'margin-top:4px' }, gw[def.warmup] ?? gw.upper),
    gw.skipIfRightAfterPT && h('div', { class: 'muted small' }, '체력단련 직후라면 생략하고 동작별 워밍업 세트만'));
}

let lastOver = null;

export function renderSession(root) {
  const a = state.active;
  if (!a) return go('#today');
  keepAwake(true);
  const def = sessionDef(a.key);
  const steps = buildSteps(a.plan, a.trim);
  const ni = nextStepIndex(a.plan, steps);
  if (a.focus != null && a.plan.entries[a.focus] == null) a.focus = null;
  const cur = a.focus ?? (ni >= 0 ? steps[ni].entry : null);
  const lastWeek = a.plan.entries.map((e) => lastPerformance(state.sessions, e.ex, exOf(e.ex).kind));
  const g = computeGuard(a, steps);
  lastOver = g.over;
  const nextName = ni >= 0 ? exName(a.plan.entries[steps[ni].entry].ex) : null;

  mount(root,
    h('div', { class: 'hud-bar' },
      h('div', null, h('div', { class: 'k' }, 'ELAPSED'), h('div', { class: 'v', id: 'hud-elapsed' }, fmtClock(g.elapsedSec))),
      h('div', null, h('div', { class: 'k' }, 'ETA'), h('div', { class: `v${g.over ? ' over' : ''}`, id: 'hud-eta' }, seoulTimeStr(g.etaMs))),
      h('div', null, h('div', { class: 'k' }, 'SETS LEFT'), h('div', { class: 'v', id: 'hud-left' }, steps.filter((s) => !isStepDone(a.plan, s)).length))),
    h('div', { class: 'spread', style: 'margin:0 2px 10px' },
      h('div', null, label(`${def.code} · WEEK ${a.week}`), h('div', { style: 'font-size:19px;font-weight:700' }, def.name)),
      a.deload && h('span', { class: 'badge amber' }, '정비 주간')),
    guardBox(a, g),
    generalWarmup(a, def),
    a.plan.entries.map((_, i) => entryCard(a, i, steps, cur, lastWeek)),
    ni < 0 && h('div', { class: 'card hud' }, label('ALL SETS DONE'), h('p', null, '모든 세트를 마쳤습니다. 아래 작전 종료를 눌러 판정을 실행하세요.')),
    h('div', { style: 'height:12px' }),
    restPanel(a) ?? h('div', { class: 'session-foot' },
      h('button', { class: 'btn danger', onclick: cancelSession }, '작전 취소'),
      h('button', { class: `btn ${ni < 0 ? 'primary' : 'od'}`, 'data-testid': 'end', onclick: endSession }, h('span', { class: 'en' }, 'RTB'), ' 작전 종료')),
  );
  if (a.rest) {
    $('#rest-next').textContent = nextName ? `다음: ${nextName}` : '';
    tick();
  }
}

function computeGuard(a, steps) {
  const now = Date.now();
  const restLeft = a.rest ? Math.max(0, (a.rest.endsAt - now) / 1000) : 0;
  const remaining = remainingSec(a.plan, steps, { restLeft, setSec: P.GUARD.setSec });
  return guard({ now, startedAt: a.startedAt, remaining, limitMin: P.GUARD.limitMin });
}

// 250ms마다 호출(세션 화면일 때)
export function tick() {
  const a = state.active;
  if (!a) return;
  const steps = buildSteps(a.plan, a.trim);
  const g = computeGuard(a, steps);
  const el = $('#hud-elapsed');
  if (el) {
    el.textContent = fmtClock(g.elapsedSec);
    const eta = $('#hud-eta');
    eta.textContent = seoulTimeStr(g.etaMs);
    eta.classList.toggle('over', g.over);
    if (g.over !== lastOver) { lastOver = g.over; $('#guard')?.replaceWith(guardBox(a, g)); }
  }
  const r = a.rest;
  if (!r) return;
  const left = (r.endsAt - Date.now()) / 1000;
  const clock = $('#rest-clock');
  if (clock) {
    clock.textContent = left > 0 ? fmtClock(Math.ceil(left)) : '0:00';
    clock.classList.toggle('ending', left <= 3);
    $('#rest-bar').style.width = `${Math.max(0, Math.min(100, (left / r.total) * 100))}%`;
    const lab = $('.rest-label');
    if (lab) lab.textContent = left > 0 ? 'REST' : 'REST COMPLETE — 휴식 종료';
  }
  const { sound, voice } = state.settings;
  if (left < -3 && !r.ended) { r.ended = true; save(); return; } // 앱 복귀 시 지난 알림은 생략
  const sec = Math.ceil(left);
  if (left > 0 && sec <= 3 && r.lastBeep !== sec) {
    r.lastBeep = sec;
    if (sound) beep({ freq: 880 });
  }
  if (left <= 0 && !r.ended) {
    r.ended = true;
    if (sound) beep({ freq: 1320, dur: 0.45 });
    if (voice) speak('휴식 종료');
    save();
  }
}

function cancelSession() {
  const a = state.active;
  const any = a.plan.entries.some((e) => e.sets.length);
  if (!confirm(any ? '기록한 세트를 모두 버리고 작전을 취소할까요?' : '작전을 취소할까요?')) return;
  state.active = null;
  keepAwake(false);
  save();
  go('#today');
}

function endSession() {
  const a = state.active;
  const steps = buildSteps(a.plan, a.trim);
  const left = steps.filter((s) => !isStepDone(a.plan, s)).length;
  if (!a.plan.entries.some((e) => e.sets.length)) return toast('기록한 세트가 없습니다 — 취소하려면 작전 취소');
  if (left && !confirm(`남은 세트 ${left}개가 있습니다. 작전을 종료하고 판정할까요?`)) return;

  const results = a.plan.entries.map((e) => {
    const ex = exOf(e.ex);
    return judgeExercise({
      exId: e.ex, ex, presc: e.presc, sets: e.sets, settings: state.settings,
      history: judgeHistory(state.sessions, e.ex, ex.kind), deload: a.deload,
    });
  });
  const rec = {
    id: a.id, key: a.key, date: a.date, week: a.week, deload: a.deload,
    startedAt: a.startedAt, endedAt: Date.now(),
    entries: a.plan.entries.map(({ slotId, itemIdx, ex, presc, sets }) => ({
      slotId, itemIdx, ex, presc, sets: sets.map(({ w, reps, rir }) => ({ w, reps, rir })),
    })),
    results,
    negBase: state.exState.negative_pullup?.stage ?? 0,
    negEasy: false,
  };
  for (const r of results) {
    if (r.weight == null || r.action === 'skip') continue;
    state.targets[r.exId] = { weight: r.weight, reason: r.reason, action: r.action, date: a.date, from: a.id };
  }
  state.sessions.push(rec);
  state.active = null;
  keepAwake(false);
  save();
  go(`#summary/${rec.id}`);
}
