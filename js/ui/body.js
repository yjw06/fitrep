// 체중·단백질: 금일 임무 카드 + 상세(#body)
import { h, mount, label, stepper, toast } from './dom.js';
import { state, save } from '../store.js';
import { shortDate, addDays } from '../logic/dates.js';
import { weightTrend, upsertWeight, proteinTotal, proteinStatus, rollingAverage } from '../logic/body.js';
import { fmtKg } from '../logic/num.js';
import { P, today } from './common.js';
import { lineChart } from './chart.js';
import { rerender, go } from './nav.js';

function trendLine(date) {
  const t = weightTrend(state.bodyweight, date, P.BODY);
  if (t.avg == null) return h('div', { class: 'muted small' }, '아침 공복 체중을 기록하세요.');
  return h('div', { class: 'small' },
    `7일 평균 ${fmtKg(t.avg)}kg (${t.n}일)`,
    t.enough ? ` · 2주 전 대비 ${t.diff >= 0 ? '+' : ''}${fmtKg(t.diff)}kg` : ' · 2주 비교는 기록이 더 필요',
    t.suggest && h('div', { style: 'margin-top:4px' }, h('span', { class: 'badge amber', 'data-testid': 'kcal-suggest' }, `하루 +${P.BODY.kcal}kcal`),
      ` 증가 페이스 미달(목표 주 +${P.BODY.weeklyGain[0]}~${P.BODY.weeklyGain[1]}kg)`));
}

function proteinBlock(date) {
  const list = state.protein[date] ?? [];
  const total = proteinTotal(list);
  const [lo, hi] = state.settings.proteinTarget;
  const st = proteinStatus(total, [lo, hi]);
  return [
    h('div', { class: 'spread' }, h('b', null, '단백질'), h('span', { class: 'num', 'data-testid': 'protein-total' }, `${fmtKg(total)} / ${lo}~${hi}g`)),
    h('div', { class: 'progress prot' }, h('i', { style: `width:${Math.min(100, (total / hi) * 100)}%` })),
    h('div', { class: 'muted small' }, st === 'low' ? `${fmtKg(Math.round((lo - total) * 10) / 10)}g 더` : st === 'ok' ? '목표 범위 달성' : '목표 초과'),
    h('div', { class: 'qadd', style: 'margin-top:8px' }, state.settings.proteinPresets.map((p, i) => h('button', { class: 'btn', 'data-testid': `protein-${i}`, onclick: () => {
      state.protein[date] = [...list, { name: p.name, g: p.g, at: Date.now() }];
      save(); rerender();
    } }, `+ ${p.name}`, h('span', { class: 'muted small' }, ` ${p.g}g`)))),
    list.length > 0 && h('div', { class: 'small', style: 'margin-top:6px' }, list.map((x, k) => h('span', { class: 'badge', style: 'margin:2px' }, `${x.name} ${x.g}g `,
      h('button', { class: 'btn sm ghost', 'aria-label': '삭제', style: 'min-height:32px;min-width:32px;padding:0', onclick: () => {
        state.protein[date] = list.filter((_, j) => j !== k); save(); rerender();
      } }, '✕')))),
  ];
}

export function rationCard(date) {
  const todayKg = state.bodyweight.find((e) => e.date === date)?.kg;
  let kg = todayKg ?? state.bodyweight.at(-1)?.kg ?? 70;
  return h('div', { class: 'card', 'data-testid': 'ration-card' },
    h('div', { class: 'spread' }, label('RATION & WEIGHT'), h('button', { class: 'btn sm ghost', onclick: () => go('#body') }, '기록 보기')),
    h('div', { class: 'row', style: 'margin-top:6px' },
      h('div', { class: 'grow' }, stepper({ value: kg, step: 0.1, min: 30, max: 200, unit: 'kg', label: '아침 체중', testid: 'bw', onChange: (v) => { kg = v; } })),
      h('button', { class: 'btn od', 'data-testid': 'bw-save', onclick: () => {
        state.bodyweight = upsertWeight(state.bodyweight, date, kg);
        save(); toast('체중 기록'); rerender();
      } }, todayKg != null ? '수정' : '기록')),
    trendLine(date),
    h('div', { style: 'height:10px' }),
    proteinBlock(date));
}

export function renderBody(root) {
  const date = today();
  const bw = state.bodyweight;
  const roll = rollingAverage(bw, P.BODY.avgDays);
  const days = Array.from({ length: 7 }, (_, i) => addDays(date, -i));
  mount(root,
    h('div', { class: 'spread', style: 'margin:4px 2px 10px' },
      h('div', null, label('RATION & WEIGHT'), h('div', { style: 'font-size:20px;font-weight:700' }, '체중·단백질')),
      h('button', { class: 'btn sm', onclick: () => go('#today') }, '임무로')),
    h('div', { class: 'card hud' }, label('7-DAY AVERAGE'), lineChart(roll.slice(-60).map((r) => ({ y: r.avg, label: r.date.slice(5).replace('-', '/') }))), trendLine(date)),
    h('div', { class: 'card' }, label('PROTEIN · 7 DAYS'),
      h('table', { class: 'hist' }, h('tbody', null, days.map((d) => {
        const t = proteinTotal(state.protein[d]);
        return h('tr', null, h('td', null, shortDate(d)), h('td', { class: 'num' }, `${fmtKg(t)}g`), h('td', { class: 'small muted' }, t ? proteinStatus(t, state.settings.proteinTarget) === 'ok' ? '달성' : t < state.settings.proteinTarget[0] ? '부족' : '초과' : ''));
      })))),
    h('div', { class: 'card' }, label('WEIGHT LOG'),
      bw.length ? h('table', { class: 'hist' }, h('tbody', null, [...bw].reverse().slice(0, 30).map((e) => h('tr', null,
        h('td', null, shortDate(e.date)), h('td', { class: 'num' }, `${fmtKg(e.kg)}kg`),
        h('td', null, h('button', { class: 'btn sm danger', 'aria-label': '삭제', onclick: () => {
          if (!confirm('이 체중 기록을 삭제할까요?')) return;
          state.bodyweight = bw.filter((x) => x.date !== e.date); save(); rerender();
        } }, '✕'))))))
        : h('p', { class: 'muted' }, '아직 기록이 없습니다.')),
    h('p', { class: 'muted small' }, '단백질 프리셋·목표는 설정 탭에서 바꿀 수 있습니다.'));
}
