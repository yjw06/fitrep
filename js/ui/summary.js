// 세션 종료 → 판정 결과 → 다음 목표(수정 가능)
import { h, mount, label, stamp, stepper } from './dom.js';
import { state, save } from '../store.js';
import { nextNegStage } from '../logic/progression.js';
import { fmtClock, shortDate } from '../logic/dates.js';
import { fmtKg } from '../logic/num.js';
import { P, exOf, exName, usesWeight, sessionDef } from './common.js';
import { go } from './nav.js';

const ARROW = { increase: ['▲', 'up'], stall: ['▼', 'down'], decrease: ['▼', 'down'] };

export function renderSummary(root, id) {
  const rec = state.sessions.find((s) => s.id === id);
  if (!rec) return go('#today');
  const def = sessionDef(rec.key);
  const sets = rec.entries.reduce((a, e) => a + e.sets.length, 0);
  const dur = (rec.endedAt - rec.startedAt) / 1000;
  const maxStage = P.NEGATIVE_STAGES.length - 1;

  const rows = (rec.results ?? []).map((r) => {
    const ex = exOf(r.exId);
    const [arrow, cls] = ARROW[r.action] ?? ['■', ''];
    let control = null;
    if (r.action === 'check') {
      const cur = nextNegStage(rec.negBase, rec.negEasy, maxStage);
      const info = h('div', { class: 'muted small' }, `다음: ${P.NEGATIVE_STAGES[cur].label}`);
      control = [h('label', { class: 'check' },
        h('input', { type: 'checkbox', checked: rec.negEasy, 'data-testid': 'neg-easy', onchange: (e) => {
          rec.negEasy = e.target.checked;
          const st = nextNegStage(rec.negBase, rec.negEasy, maxStage);
          state.exState.negative_pullup = { stage: st };
          info.textContent = `다음: ${P.NEGATIVE_STAGES[st].label}`;
          save();
        } }), rec.negBase >= maxStage ? '수월했음(최종 단계)' : '수월했음 → 다음 단계'), info];
    } else if (r.weight != null && usesWeight(ex)) {
      const t = state.targets[r.exId];
      control = h('div', { class: 'row' }, h('span', { class: 'small muted', style: 'width:64px' }, '다음 목표'),
        h('div', { class: 'grow' }, stepper({ value: t?.weight ?? r.weight, step: 2.5, min: 0, max: 500, unit: 'kg', label: ex.kind === 'assist' ? '보조' : '무게',
          onChange: (v) => { state.targets[r.exId] = { ...(t ?? {}), weight: v, action: 'manual', reason: '직접 수정', date: rec.date }; save(); } })));
    }
    return h('div', { class: 'res', 'data-testid': `res-${r.exId}` },
      h('div', { class: 'spread' }, h('b', null, exName(r.exId)),
        r.weight != null && usesWeight(ex) && h('span', { class: `arrow ${cls}` }, `${fmtKg(r.prev)} → ${fmtKg(r.weight)}kg ${arrow}`)),
      h('div', { class: 'small muted' }, r.reason),
      control);
  });

  mount(root,
    h('div', { class: 'card hud' },
      h('div', { class: 'spread' }, label('AFTER ACTION REPORT'), stamp()),
      h('h2', null, def.name),
      h('div', { class: 'row wrap' },
        h('span', { class: 'badge' }, shortDate(rec.date)),
        h('span', { class: 'badge' }, `WEEK ${rec.week}`),
        h('span', { class: 'badge' }, `${fmtClock(dur)} 소요`),
        h('span', { class: 'badge' }, `${sets}세트`),
        rec.deload && h('span', { class: 'badge amber' }, '정비 주간'))),
    h('div', { class: 'card' }, label('NEXT TARGETS'), h('p', { class: 'muted small' }, '다음 세션에 미리 채워집니다. 고칠 수 있습니다.'), rows),
    h('button', { class: 'btn primary block big', 'data-testid': 'summary-ok', onclick: () => go('#today') }, '확인'));
}
