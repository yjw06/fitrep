// 검정 탭: 측정값 입력·이력 (2단계에서 2분 모드 추가)
import { h, mount, label, stepper, toast } from './dom.js';
import { state, save } from '../store.js';
import { shortDate, fmtClock, parseClock, isDateStr } from '../logic/dates.js';
import { latestTestValues, sixty } from '../logic/missions.js';
import { uid } from '../logic/schema.js';
import { today } from './common.js';
import { rerender } from './nav.js';

export function renderTest(root) {
  const latest = latestTestValues(state.tests);
  const d = { date: today(), pullups: latest.pullups ?? 0, pushups: latest.pushups ?? 0, situps: latest.situps ?? 0, run: '' };
  const dateIn = h('input', { type: 'date', value: d.date, onchange: (e) => { d.date = e.target.value; } });
  const runIn = h('input', { inputmode: 'numeric', placeholder: '예: 12:45 (선택)', onchange: (e) => { d.run = e.target.value; } });
  const goals = state.settings.goals;
  const list = [...state.tests].sort((a, b) => (a.date < b.date ? 1 : -1));

  mount(root,
    h('div', { style: 'margin:4px 2px 10px' }, label('PT TEST'), h('div', { style: 'font-size:20px;font-weight:700' }, '체력 검정')),
    h('div', { class: 'card hud' },
      label('CURRENT 60%'),
      h('div', { class: 'grid3', style: 'text-align:center;margin-top:6px' },
        h('div', null, h('div', { class: 'kpi' }, latest.pullups ?? '—'), h('div', { class: 'small muted' }, '턱걸이 최대')),
        h('div', null, h('div', { class: 'kpi' }, sixty(latest.pushups) ?? '—'), h('div', { class: 'small muted' }, `팔굽 ×5 (최대 ${latest.pushups ?? '—'}${goals.pushups ? `/목표 ${goals.pushups}` : ''})`)),
        h('div', null, h('div', { class: 'kpi' }, sixty(latest.situps) ?? '—'), h('div', { class: 'small muted' }, `윗몸 ×4 (최대 ${latest.situps ?? '—'}${goals.situps ? `/목표 ${goals.situps}` : ''})`)))),
    h('div', { class: 'card' },
      label('NEW RECORD'),
      h('label', { class: 'field', style: 'margin-top:8px' }, h('span', null, '측정일'), dateIn),
      h('div', { class: 'stack' },
        stepper({ value: d.pullups, step: 1, min: 0, max: 99, label: '정자세 턱걸이', testid: 't-pull', onChange: (v) => { d.pullups = v; } }),
        stepper({ value: d.pushups, step: 1, min: 0, max: 300, label: '팔굽 2분', testid: 't-push', onChange: (v) => { d.pushups = v; } }),
        stepper({ value: d.situps, step: 1, min: 0, max: 300, label: '윗몸 2분', testid: 't-sit', onChange: (v) => { d.situps = v; } })),
      h('label', { class: 'field', style: 'margin-top:12px' }, h('span', null, `3km 기록(선택, 목표 ${fmtClock(goals.run3kSec)})`), runIn),
      h('button', { class: 'btn primary block big', 'data-testid': 't-save', onclick: () => {
        if (!isDateStr(d.date)) return toast('측정일을 확인하세요');
        const run = d.run ? parseClock(d.run) : null;
        if (d.run && run == null) return toast('3km는 m:ss 형식(예: 12:45)');
        state.tests.push({ id: uid(), date: d.date, pullups: d.pullups, pushups: d.pushups, situps: d.situps, run3kSec: run, mode: 'manual' });
        save(); toast('검정 기록 저장 — 60% 재계산'); rerender();
      } }, '기록 저장')),
    h('div', { class: 'card' },
      label('HISTORY'),
      list.length ? h('table', { class: 'hist' },
        h('thead', null, h('tr', null, ['DATE', 'PULL', 'PUSH', 'SIT', '3KM', ''].map((t) => h('th', null, t)))),
        h('tbody', null, list.map((t) => h('tr', null,
          h('td', null, shortDate(t.date)), h('td', null, t.pullups ?? '—'), h('td', null, t.pushups ?? '—'), h('td', null, t.situps ?? '—'),
          h('td', null, t.run3kSec ? fmtClock(t.run3kSec) : '—'),
          h('td', null, h('button', { class: 'btn sm danger', 'aria-label': '삭제', onclick: () => {
            if (!confirm('이 검정 기록을 삭제할까요?')) return;
            state.tests = state.tests.filter((x) => x.id !== t.id); save(); rerender();
          } }, '✕'))))))
        : h('p', { class: 'muted' }, '아직 기록이 없습니다.')));
}
