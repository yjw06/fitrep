// 첫 실행 설정
import { h, mount, toast } from './dom.js';
import { state, save, requestPersist } from '../store.js';
import { upcomingMonday, todayStr, parseClock, fmtClock, dowOf, isDateStr } from '../logic/dates.js';
import { uid } from '../logic/schema.js';
import { go } from './nav.js';

const num = (v) => (v === '' || v == null || Number.isNaN(+v) ? null : +v);

export function renderSetup(root) {
  const s = state.settings;
  const today = todayStr();
  const f = (name, labelText, attrs = {}) => h('label', { class: 'field' }, h('span', null, labelText), h('input', { name, ...attrs }));
  const form = h('form', { class: 'card hud', onsubmit: (ev) => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const callsign = d.callsign.trim();
    if (!callsign) return toast('콜사인을 입력하세요');
    if (!isDateStr(d.startDate) || dowOf(d.startDate) !== 1) return toast('시작일은 월요일이어야 합니다');
    const run = parseClock(d.run3k);
    if (d.run3k && run == null) return toast('3km 기록은 m:ss 형식(예: 12:30)');
    s.callsign = callsign;
    s.startDate = d.startDate;
    s.goals = { pushups: num(d.goalPush), situps: num(d.goalSit), run3kSec: run ?? 750 };
    const t = { pullups: num(d.pullups), pushups: num(d.pushups), situps: num(d.situps) };
    if (Object.values(t).some((v) => v != null)) state.tests.push({ id: uid(), date: today, ...t, mode: 'manual' });
    state.setupDone = true;
    save();
    requestPersist();
    go('#today');
  } },
    h('div', { class: 'label' }, 'INITIAL SETUP'),
    h('h2', null, '작전 준비'),
    h('p', { class: 'muted small' }, '모든 값은 이 기기에만 저장됩니다. 나중에 설정 탭에서 바꿀 수 있습니다.'),
    f('callsign', '콜사인', { value: s.callsign, required: true, maxlength: 16, autocomplete: 'off', placeholder: '예: EAGLE' }),
    f('startDate', '시작일(월요일)', { type: 'date', value: s.startDate ?? upcomingMonday(today), required: true }),
    h('div', { class: 'label sec-title' }, 'LATEST PT TEST'),
    h('div', { class: 'grid3' },
      f('pullups', '정자세 턱걸이', { type: 'number', inputmode: 'numeric', min: 0, max: 99 }),
      f('pushups', '팔굽 2분', { type: 'number', inputmode: 'numeric', min: 0, max: 300 }),
      f('situps', '윗몸 2분', { type: 'number', inputmode: 'numeric', min: 0, max: 300 })),
    h('div', { class: 'label sec-title' }, 'OBJECTIVE'),
    h('div', { class: 'grid3' },
      f('goalPush', '팔굽 목표', { type: 'number', inputmode: 'numeric', min: 0, value: s.goals.pushups ?? '' }),
      f('goalSit', '윗몸 목표', { type: 'number', inputmode: 'numeric', min: 0, value: s.goals.situps ?? '' }),
      f('run3k', '3km 목표', { inputmode: 'numeric', value: fmtClock(s.goals.run3kSec ?? 750), placeholder: '12:30' })),
    h('button', { class: 'btn primary block big', type: 'submit' }, h('span', { class: 'en' }, 'CONFIRM'), ' 설정 완료'),
  );
  mount(root, form);
}
