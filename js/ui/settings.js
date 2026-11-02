// 설정: 기본·측정 기준일·장비·증가폭·소리·백업·초기화
import { h, mount, label, stepper, toast } from './dom.js';
import { state, save, replace, exportBackup, importBackupFile } from '../store.js';
import { dowOf, isDateStr } from '../logic/dates.js';
import { testAnchor } from '../logic/pttest.js';
import { defaultState } from '../logic/schema.js';
import { resetWorkout, resetCounts, resetStartDate } from '../logic/reset.js';
import { incrementFor } from '../logic/progression.js';
import { fmtKg } from '../logic/num.js';
import { P, exName, today } from './common.js';
import { unlockAudio, beep, speak } from './fx.js';
import { APP_VERSION } from '../version.js';
import { rerender } from './nav.js';
import { applyTheme, checkForUpdate } from './shell.js';

const INC_CHOICES = [0.5, 1, 1.25, 2, 2.5, 4, 5, 10];
const ALL_PLATES = [25, 20, 15, 10, 5, 2.5, 2, 1.25, 1, 0.5];
const EQUIP = [['barbell', '바벨'], ['smith', '스미스'], ['dumbbell', '덤벨'], ['machine', '머신'], ['cable', '케이블'], ['assist', '어시스트(보조 −)']];

const field = (text, el) => h('label', { class: 'field' }, h('span', null, text), el);
const sw = (text, checked, onchange, testid) => h('label', { class: 'switch' }, h('span', null, text),
  h('input', { type: 'checkbox', checked, 'data-testid': testid, onchange: (e) => onchange(e.target.checked) }));
const incSelect = (value, onchange, extra = []) => h('select', { onchange: (e) => onchange(e.target.value) },
  extra, INC_CHOICES.map((v) => h('option', { value: v, selected: value === v }, `${v}kg`)));

export function renderSettings(root) {
  const s = state.settings;
  const commit = (msg) => { save(); if (msg) toast(msg); };

  const weightedEx = Object.entries(P.EXERCISES).filter(([, ex]) => ['accessory', 'assist'].includes(ex.kind));

  mount(root,
    h('div', { style: 'margin:4px 2px 10px' }, label('CONFIG'), h('div', { style: 'font-size:20px;font-weight:700' }, '설정')),

    h('div', { class: 'card' }, label('BASIC'),
      field('콜사인', h('input', { value: s.callsign, maxlength: 16, onchange: (e) => { s.callsign = e.target.value.trim() || s.callsign; commit('저장'); rerender(); } })),
      field('시작일(월요일) — 주차 기준', h('input', { type: 'date', value: s.startDate ?? '', onchange: (e) => {
        const v = e.target.value;
        if (!isDateStr(v) || dowOf(v) !== 1) { e.target.value = s.startDate ?? ''; return toast('월요일만 선택할 수 있습니다'); }
        s.startDate = v; commit('저장');
      } })),
      h('div', { class: 'field' }, h('span', null, '정비 주간 주기(N주마다)'),
        stepper({ value: s.deloadEvery, step: 1, min: 0, max: 12, label: '주', onChange: (v) => { s.deloadEvery = v; commit(); } })),
      h('div', { class: 'muted small' }, `0이면 정비 주간 없음 · 현재 ${s.deloadEvery ? `${s.deloadEvery}·${s.deloadEvery * 2}·${s.deloadEvery * 3}…주차` : '끔'}`),
      h('div', { class: 'chips', style: 'grid-template-columns:1fr 1fr;margin-top:12px' },
        ['dark', 'light'].map((t) => h('button', { class: `chip${s.theme === t ? ' on' : ''}`, 'data-testid': `theme-${t}`, onclick: () => { s.theme = t; applyTheme(); commit(); rerender(); } },
          h('span', { class: 'en' }, t === 'dark' ? 'NIGHT' : 'DAY'), t === 'dark' ? '야간(다크)' : '주간(라이트)')))),

    h('div', { class: 'card' }, label('PULL-UP TEST'),
      field('턱걸이 측정 기준일(일요일) — 14일마다', h('input', { type: 'date', value: testAnchor(s) ?? '', 'data-testid': 'anchor', onchange: (e) => {
        const v = e.target.value;
        if (!isDateStr(v) || dowOf(v) !== 7) { e.target.value = testAnchor(s) ?? ''; return toast('일요일만 선택할 수 있습니다'); }
        s.testAnchorDate = v; commit('저장');
      } })),
      h('div', { class: 'muted small' }, s.testAnchorDate ? '' : '미설정 — 시작 주의 일요일 기준')),

    h('div', { class: 'card' }, label('BAR & PLATES'),
      h('div', { class: 'field' }, h('span', null, '봉 무게'), stepper({ value: s.bar, step: 2.5, min: 0, max: 30, unit: 'kg', label: '봉', onChange: (v) => { s.bar = v; commit(); } })),
      h('div', { class: 'field' }, h('span', null, '보유 원판(한 장 기준)'),
        h('div', { class: 'row wrap' }, ALL_PLATES.map((p) => h('label', { class: 'check', style: 'min-width:30%' },
          h('input', { type: 'checkbox', checked: s.plates.includes(p), onchange: (e) => {
            const next = e.target.checked ? [...s.plates, p] : s.plates.filter((x) => x !== p);
            if (!next.length) { e.target.checked = true; return toast('원판을 하나 이상 선택하세요'); }
            s.plates = next.sort((a, b) => b - a); commit();
          } }), `${p}kg`))))),

    h('div', { class: 'card' }, label('INCREMENTS'),
      h('div', { class: 'grid2' },
        field('메인 상체', incSelect(s.inc.mainUpper, (v) => { s.inc.mainUpper = +v; commit(); })),
        field('메인 하체', incSelect(s.inc.mainLower, (v) => { s.inc.mainLower = +v; commit(); })),
        EQUIP.map(([k, t]) => field(t, incSelect(s.inc[k], (v) => { s.inc[k] = +v; commit(); rerender(); })))),
      h('details', null, h('summary', { style: 'min-height:44px;display:flex;align-items:center' }, '종목별 증가폭'),
        weightedEx.map(([id, ex]) => {
          const o = s.incOverride[id];
          return field(exName(id), incSelect(o, (v) => {
            if (v === '') delete s.incOverride[id]; else s.incOverride[id] = +v;
            commit();
          }, [h('option', { value: '', selected: o == null }, `기본 (${fmtKg(incrementFor(id, { ...ex }, { ...s, incOverride: {} }))}kg)`)]));
        }))),

    h('div', { class: 'card' }, label('AUDIO'),
      sw('휴식 종료 비프', s.sound, (v) => { s.sound = v; commit(); }),
      sw('음성 안내(ko-KR)', s.voice, (v) => { s.voice = v; commit(); }),
      h('button', { class: 'btn block', style: 'margin-top:8px', onclick: () => {
        unlockAudio();
        if (s.sound) [0, 1, 2].forEach((k) => beep({ at: k * 1 }));
        if (s.voice) setTimeout(() => speak('휴식 종료'), 3000);
      } }, '소리 테스트')),

    h('div', { class: 'card' }, label('BACKUP'),
      h('p', { class: 'muted small' }, '홈 화면 앱과 Safari는 저장소가 따로입니다. 주기적으로 백업 파일을 파일 앱/메일 등에 보관하세요.'),
      h('div', { class: 'grid2' },
        h('button', { class: 'btn od', onclick: async () => {
          const r = await exportBackup();
          if (r !== 'cancelled') toast(r === 'shared' ? '백업 공유 완료' : '백업 파일 저장');
        } }, '내보내기'),
        h('label', { class: 'btn' }, '가져오기', h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async (e) => {
          const f = e.target.files[0];
          if (!f) return;
          try {
            const next = await importBackupFile(f);
            if (!confirm(`세션 ${next.sessions.length}개 · 검정 ${next.tests.length}개를 불러옵니다. 현재 데이터를 덮어쓸까요?`)) return;
            replace(next); applyTheme(); toast('불러왔습니다'); location.hash = '#today';
          } catch (err) { toast(`실패: ${err.message}`); }
          e.target.value = '';
        } })))),

    h('div', { class: 'card' }, label('RESET'),
      h('button', { class: 'btn danger block', 'data-testid': 'reset-open', onclick: resetDialog }, '운동 초기화'),
      h('p', { class: 'muted small' }, '설정은 그대로 두고 운동 기록만 골라 지운 뒤 1주차부터 다시 시작합니다.'),
      h('button', { class: 'btn danger block', onclick: () => {
        if (!confirm('모든 기록과 설정을 지우고 첫 설정 화면으로 갑니다. 먼저 백업하세요. 계속할까요?')) return;
        if (!confirm('정말 전체 초기화할까요? 되돌릴 수 없습니다.')) return;
        replace(defaultState()); applyTheme(); location.hash = '#setup';
      } }, '전체 초기화(설정 포함)')),

    h('div', { class: 'card' }, label('SYSTEM'),
      h('div', { class: 'spread' }, h('span', null, '앱 버전'), h('span', { class: 'mono' }, APP_VERSION)),
      h('button', { class: 'btn block', style: 'margin-top:8px', onclick: () => checkForUpdate(true) }, '업데이트 확인')));
}

// 운동 초기화: 지울 기록을 고르고(기본: 헬스 기록), 헬스 기록을 지우면 시작일(1주차)도 다시 정한다
function resetDialog() {
  const c = resetCounts(state);
  const opt = { gym: true, tests: false, startDate: resetStartDate(state.settings.startDate, today()) };
  const startField = h('label', { class: 'field', style: 'margin:0 0 10px 38px' }, h('span', null, '시작일(월요일) — 이 주가 1주차'),
    h('input', { type: 'date', value: opt.startDate, 'data-testid': 'reset-start', onchange: (e) => { opt.startDate = e.target.value; } }));
  const box = (key, title, sub, testid) => h('label', { class: 'check', style: 'align-items:flex-start;padding:6px 0' },
    h('input', { type: 'checkbox', checked: opt[key], 'data-testid': testid, onchange: (e) => {
      opt[key] = e.target.checked;
      if (key === 'gym') startField.hidden = !e.target.checked;
    } }),
    h('span', null, h('b', null, title), h('div', { class: 'muted small' }, sub)));
  const dlg = h('dialog', { class: 'sheet', 'data-testid': 'reset-dialog' },
    label('RESET'),
    h('h3', null, '운동 초기화'),
    h('p', { class: 'muted small' }, '콜사인·장비·증가폭·목표·소리 같은 설정은 그대로 두고, 고른 기록만 지웁니다.'),
    box('gym', '헬스 기록', `세션 ${c.sessions}개 · 다음 목표 무게 · 네거티브 단계`, 'reset-gym'),
    startField,
    box('tests', '턱걸이 측정 기록', `${c.tests}개 — 지우면 로드맵 단계를 정하려고 다시 측정해 기록해야 해요`, 'reset-tests'),
    h('button', { class: 'btn block', style: 'margin:8px 0', onclick: async () => {
      const r = await exportBackup();
      if (r !== 'cancelled') toast(r === 'shared' ? '백업 공유 완료' : '백업 파일 저장');
    } }, '먼저 백업 내보내기'),
    h('div', { class: 'grid2' },
      h('button', { class: 'btn', onclick: () => dlg.close() }, '취소'),
      h('button', { class: 'btn danger', 'data-testid': 'reset-go', onclick: () => {
        if (!opt.gym && !opt.tests) return toast('지울 기록을 고르세요');
        if (opt.gym && (!isDateStr(opt.startDate) || dowOf(opt.startDate) !== 1)) return toast('시작일은 월요일이어야 합니다');
        if (!confirm('고른 기록을 지웁니다. 되돌릴 수 없어요. 계속할까요?')) return;
        replace(resetWorkout(state, opt));
        dlg.close();
        toast('운동 초기화 완료');
        location.hash = '#today';
      } }, '초기화')));
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
}
