// 검정 탭: 턱걸이 계급 · 2분 모드 · 측정값 입력 · 항목별 그래프 + 목표 대비 진행 · 이력
import { h, mount, label, stepper, toast } from './dom.js';
import { state, save } from '../store.js';
import { shortDate, fmtClock, parseClock, isDateStr } from '../logic/dates.js';
import { latestTestValues, sixty } from '../logic/missions.js';
import { testAnchor, isTestDay, nextTestDate, upsertTest, goalProgress, testSeries } from '../logic/pttest.js';
import { uid } from '../logic/schema.js';
import { P, today, pullupRank, insignia } from './common.js';
import { lineChart } from './chart.js';
import { startPtTest } from './pttest.js';
import { rerender } from './nav.js';

const ITEMS = [
  { key: 'pullups', name: '정자세 턱걸이', unit: '개' },
  { key: 'pushups', name: '팔굽 2분', unit: '개' },
  { key: 'situps', name: '윗몸 2분', unit: '개' },
  { key: 'run3kSec', name: '3km', unit: '', lower: true, fmt: fmtClock },
];

function rankCard() {
  const r = pullupRank();
  return h('div', { class: 'card hud', 'data-testid': 'rank-card' },
    label('PULL-UP RANK'),
    h('div', { class: 'row', style: 'gap:14px;margin-top:6px' },
      insignia(r.rank.bars, 44),
      h('div', { class: 'grow' },
        h('div', { style: 'font-size:22px;font-weight:800' }, r.rank.name, h('span', { class: 'label', style: 'margin-left:8px' }, r.rank.code)),
        h('div', { class: 'small' }, `정자세 최대 ${r.max ?? '—'}개`),
        h('div', { class: 'muted small' }, r.next ? `${r.next.name}까지 ${r.toNext}개 (${r.next.min}개+)` : '최고 계급'))),
    h('div', { class: 'small', style: 'margin-top:8px' }, `상체A 1번: ${P.EXERCISES[r.rank.ua1.ex].name} · 스킬 데이: ${P.SKILL_PLANS[r.rank.skill].map((s) => s.name).join(' → ')}`));
}

function itemCard(it) {
  const goals = state.settings.goals;
  const goal = it.key === 'run3kSec' ? goals.run3kSec : goals[it.key];
  const series = testSeries(state.tests, it.key);
  const last = series.at(-1)?.value ?? null;
  const p = goalProgress(last, goal, it.lower);
  const f = it.fmt ?? ((v) => v);
  return h('div', { class: 'card', 'data-testid': `chart-${it.key}` },
    h('div', { class: 'spread' }, h('b', null, it.name), h('span', { class: 'num' }, last != null ? `${f(last)}${it.unit}` : '—', goal ? h('span', { class: 'muted small' }, ` / 목표 ${f(goal)}${it.unit}`) : '')),
    p != null && h('div', { class: 'progress' }, h('i', { class: p >= 1 ? 'full' : '', style: `width:${p * 100}%` })),
    p != null && h('div', { class: 'muted small' }, p >= 1 ? '목표 달성' : `목표 대비 ${Math.round(p * 100)}%`),
    series.length > 1 && lineChart(series.slice(-20).map((s) => ({ y: it.lower ? s.value / 60 : s.value, label: s.date.slice(5).replace('-', '/') })), { unit: it.lower ? '분' : '개', height: 130 }));
}

export function renderTest(root) {
  const latest = latestTestValues(state.tests);
  const d = { date: today(), pullups: latest.pullups ?? 0, pushups: latest.pushups ?? 0, situps: latest.situps ?? 0, run: '' };
  const dateIn = h('input', { type: 'date', value: d.date, onchange: (e) => { d.date = e.target.value; } });
  const runIn = h('input', { inputmode: 'numeric', placeholder: '예: 12:45 (선택)', onchange: (e) => { d.run = e.target.value; } });
  const goals = state.settings.goals;
  const anchor = testAnchor(state.settings);
  const due = isTestDay(today(), anchor);
  const next = nextTestDate(today(), anchor);
  const list = [...state.tests].sort((a, b) => (a.date < b.date ? 1 : -1));

  mount(root,
    h('div', { class: 'spread', style: 'margin:4px 2px 10px' },
      h('div', null, label('PT TEST'), h('div', { style: 'font-size:20px;font-weight:700' }, '체력 검정')),
      h('span', { class: `badge${due ? ' amber' : ''}` }, due ? '오늘 검정일' : next ? `다음 ${shortDate(next)}` : '기준일 없음')),
    rankCard(),
    h('div', { class: 'card hud' },
      label('CURRENT 60%'),
      h('div', { class: 'grid2', style: 'text-align:center;margin-top:6px' },
        h('div', null, h('div', { class: 'kpi' }, sixty(latest.pushups) ?? '—'), h('div', { class: 'small muted' }, `팔굽 ×5 (최대 ${latest.pushups ?? '—'})`)),
        h('div', null, h('div', { class: 'kpi' }, sixty(latest.situps) ?? '—'), h('div', { class: 'small muted' }, `윗몸 ×4 (최대 ${latest.situps ?? '—'})`)))),
    h('div', { class: 'card' },
      label('TWO-MINUTE DRILL'),
      h('p', { class: 'muted small' }, '3·2·1 → 30초마다 "목표 누적 N개" 음성 → 종료 비프 → 결과 입력(오늘 기록에 합쳐짐)'),
      h('div', { class: 'grid2' }, Object.entries(P.PT_TEST.items).map(([k, name]) =>
        h('button', { class: 'btn od', 'data-testid': `pt-${k}`, onclick: () => startPtTest(k) }, name)))),
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
        const patch = { pullups: d.pullups, pushups: d.pushups, situps: d.situps, mode: 'manual' };
        if (run != null) patch.run3kSec = run;
        state.tests = upsertTest(state.tests, d.date, patch, uid);
        save(); toast('검정 기록 저장 — 60%·계급 재계산'); rerender();
      } }, '기록 저장')),
    h('div', { class: 'sec-title' }, label('PROGRESS')),
    ITEMS.map(itemCard),
    h('div', { class: 'card' },
      label('HISTORY'),
      list.length ? h('table', { class: 'hist' },
        h('thead', null, h('tr', null, ['DATE', 'PULL', 'PUSH', 'SIT', '3KM', ''].map((t) => h('th', null, t)))),
        h('tbody', null, list.map((t) => h('tr', null,
          h('td', null, shortDate(t.date), t.mode === 'timed' ? h('span', { class: 'muted small' }, ' ⏱') : ''),
          h('td', null, t.pullups ?? '—'), h('td', null, t.pushups ?? '—'), h('td', null, t.situps ?? '—'),
          h('td', null, t.run3kSec ? fmtClock(t.run3kSec) : '—'),
          h('td', null, h('button', { class: 'btn sm danger', 'aria-label': '삭제', onclick: () => {
            if (!confirm('이 검정 기록을 삭제할까요?')) return;
            state.tests = state.tests.filter((x) => x.id !== t.id); save(); rerender();
          } }, '✕'))))))
        : h('p', { class: 'muted' }, '아직 기록이 없습니다.')));
}
