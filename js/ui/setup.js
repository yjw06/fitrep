// 첫 실행 설정: 콜사인 · 시작일 · 정자세 턱걸이 최대(로드맵 단계)
import { h, mount, toast } from './dom.js';
import { state, save, requestPersist } from '../store.js';
import { upcomingMonday, todayStr, dowOf, isDateStr } from '../logic/dates.js';
import { uid } from '../logic/schema.js';
import { go } from './nav.js';

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
    s.callsign = callsign;
    s.startDate = d.startDate;
    if (d.pullups !== '' && !Number.isNaN(+d.pullups)) state.tests.push({ id: uid(), date: today, pullups: +d.pullups, pushups: null, situps: null });
    state.setupDone = true;
    save();
    requestPersist();
    go('#today');
  } },
    h('div', { class: 'label' }, 'INITIAL SETUP'),
    h('h2', null, '작전 준비'),
    h('p', { class: 'muted small' }, '모든 값은 이 기기에만 저장됩니다. 나중에 설정·검정 탭에서 바꿀 수 있습니다.'),
    f('callsign', '콜사인', { value: s.callsign, required: true, maxlength: 16, autocomplete: 'off', placeholder: '예: EAGLE' }),
    f('startDate', '시작일(월요일) — 이 주가 1주차', { type: 'date', value: s.startDate ?? upcomingMonday(today), required: true }),
    f('pullups', '정자세 턱걸이 최대(개) — 상체 A·B 1번 종목 단계', { type: 'number', inputmode: 'numeric', min: 0, max: 99, placeholder: '예: 1' }),
    h('button', { class: 'btn primary block big', type: 'submit' }, h('span', { class: 'en' }, 'CONFIRM'), ' 설정 완료'),
  );
  mount(root, form);
}
