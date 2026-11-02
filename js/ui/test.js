// 검정 탭: 격주 일요일 정자세 턱걸이 최대 → 로드맵 단계. 팔굽·윗몸 2분은 체력검정 준비 때만(선택)
import { h, mount, label, stepper, toast } from './dom.js';
import { state, save } from '../store.js';
import { shortDate, isDateStr } from '../logic/dates.js';
import { testAnchor, isTestDay, nextTestDate, latestTestValues, upsertTest, testSeries } from '../logic/pttest.js';
import { uid } from '../logic/schema.js';
import { P, today, pullupRank } from './common.js';
import { lineChart } from './chart.js';
import { rerender } from './nav.js';

function stageCard() {
  const r = pullupRank();
  return h('div', { class: 'card hud', 'data-testid': 'rank-card' },
    label('PULL-UP ROADMAP'),
    h('div', { style: 'font-size:22px;font-weight:800;margin-top:4px' }, `턱걸이 ${r.rank.name}`),
    h('div', { class: 'small' }, `정자세 최대 ${r.max ?? '—'}개`, r.next ? h('span', { class: 'muted' }, ` · 다음 단계까지 ${r.toNext}개`) : h('span', { class: 'muted' }, ' · 마지막 단계')),
    h('div', { class: 'small', style: 'margin-top:8px' }, `상체A 1번: ${P.EXERCISES[r.rank.ua1.ex].name}`));
}

export function renderTest(root) {
  const latest = latestTestValues(state.tests);
  const d = { date: today(), pullups: latest.pullups ?? 0, pushups: latest.pushups ?? 0, situps: latest.situps ?? 0, more: false };
  const anchor = testAnchor(state.settings);
  const due = isTestDay(today(), anchor);
  const next = nextTestDate(today(), anchor);
  const list = [...state.tests].sort((a, b) => (a.date < b.date ? 1 : -1));
  const pull = testSeries(state.tests, 'pullups');

  const more = h('div', { class: 'stack', hidden: true, style: 'margin-top:10px' },
    stepper({ value: d.pushups, step: 1, min: 0, max: 300, label: '팔굽 2분', testid: 't-push', onChange: (v) => { d.pushups = v; } }),
    stepper({ value: d.situps, step: 1, min: 0, max: 300, label: '윗몸 2분', testid: 't-sit', onChange: (v) => { d.situps = v; } }));

  mount(root,
    h('div', { class: 'spread', style: 'margin:4px 2px 10px' },
      h('div', null, label('PT TEST'), h('div', { style: 'font-size:20px;font-weight:700' }, '턱걸이 측정')),
      h('span', { class: `badge${due ? ' amber' : ''}` }, due ? '오늘 측정일' : next ? `다음 ${shortDate(next)}` : '기준일 없음')),
    stageCard(),
    h('div', { class: 'card' },
      label('NEW RECORD'),
      h('label', { class: 'field', style: 'margin-top:8px' }, h('span', null, '측정일'),
        h('input', { type: 'date', value: d.date, onchange: (e) => { d.date = e.target.value; } })),
      stepper({ value: d.pullups, step: 1, min: 0, max: 99, label: '정자세 턱걸이 최대', testid: 't-pull', onChange: (v) => { d.pullups = v; } }),
      h('label', { class: 'check', style: 'margin-top:6px' },
        h('input', { type: 'checkbox', 'data-testid': 't-more', onchange: (e) => { d.more = e.target.checked; more.hidden = !d.more; } }),
        '팔굽·윗몸 2분도 기록(체력검정 준비 때)'),
      more,
      h('button', { class: 'btn primary block big', style: 'margin-top:12px', 'data-testid': 't-save', onclick: () => {
        if (!isDateStr(d.date)) return toast('측정일을 확인하세요');
        const patch = { pullups: d.pullups };
        if (d.more) Object.assign(patch, { pushups: d.pushups, situps: d.situps });
        state.tests = upsertTest(state.tests, d.date, patch, uid);
        save(); toast('측정 기록 저장 — 단계 다시 계산'); rerender();
      } }, '기록 저장')),
    pull.length > 0 && h('div', { class: 'card', 'data-testid': 'chart-pullups' },
      label('PULL-UPS'),
      lineChart(pull.slice(-20).map((x) => ({ y: x.value, label: x.date.slice(5).replace('-', '/') })), { unit: '개', height: 140 })),
    h('div', { class: 'card' },
      label('HISTORY'),
      list.length ? h('table', { class: 'hist' },
        h('thead', null, h('tr', null, ['DATE', 'PULL', 'PUSH', 'SIT', ''].map((t) => h('th', null, t)))),
        h('tbody', null, list.map((t) => h('tr', null,
          h('td', null, shortDate(t.date)), h('td', null, t.pullups ?? '—'), h('td', null, t.pushups ?? '—'), h('td', null, t.situps ?? '—'),
          h('td', null, h('button', { class: 'btn sm danger', 'aria-label': '삭제', onclick: () => {
            if (!confirm('이 측정 기록을 삭제할까요?')) return;
            state.tests = state.tests.filter((x) => x.id !== t.id); save(); rerender();
          } }, '✕'))))))
        : h('p', { class: 'muted' }, '아직 기록이 없습니다.')));
}
