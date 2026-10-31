// 설정: 기본·목표·장비·증가폭·소리·단축어·백업
import { h, mount, label, stepper, toast } from './dom.js';
import { state, save, replace, exportBackup, importBackupFile, isPersisted, requestPersist } from '../store.js';
import { dowOf, dowKo, fmtClock, parseClock, isDateStr } from '../logic/dates.js';
import { testAnchor } from '../logic/pttest.js';
import { defaultState } from '../logic/schema.js';
import { incrementFor } from '../logic/progression.js';
import { fmtKg } from '../logic/num.js';
import { P, exName } from './common.js';
import { unlockAudio, beep, speak, shortcutUrl } from './fx.js';
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
  const persistEl = h('span', { class: 'muted small' }, '확인 중…');
  isPersisted().then((p) => { persistEl.textContent = p == null ? '미지원' : p ? '영구 저장 허용됨' : '허용 안 됨(브라우저가 정리할 수 있음)'; });

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

    h('div', { class: 'card' }, label('OBJECTIVE'),
      h('div', { class: 'grid2' },
        field('턱걸이 목표', h('input', { type: 'number', inputmode: 'numeric', value: s.goals.pullups ?? '', onchange: (e) => { s.goals.pullups = e.target.value === '' ? null : +e.target.value; commit('저장'); } })),
        field('팔굽 목표', h('input', { type: 'number', inputmode: 'numeric', value: s.goals.pushups ?? '', onchange: (e) => { s.goals.pushups = e.target.value === '' ? null : +e.target.value; commit('저장'); } })),
        field('윗몸 목표', h('input', { type: 'number', inputmode: 'numeric', value: s.goals.situps ?? '', onchange: (e) => { s.goals.situps = e.target.value === '' ? null : +e.target.value; commit('저장'); } })),
        field('3km 목표', h('input', { inputmode: 'numeric', value: fmtClock(s.goals.run3kSec), onchange: (e) => {
          const v = parseClock(e.target.value);
          if (v == null) { e.target.value = fmtClock(s.goals.run3kSec); return toast('m:ss 형식(예: 12:30)'); }
          s.goals.run3kSec = v; commit('저장');
        } }))),
      h('div', { class: 'muted small' }, `400m 목표 페이스 = 3km 목표 ÷ 7.5 = ${fmtClock(Math.round(s.goals.run3kSec / 7.5))}`)),

    h('div', { class: 'card' }, label('SCHEDULE'),
      field('체력 검정 기준일(일요일) — 14일마다', h('input', { type: 'date', value: testAnchor(s) ?? '', 'data-testid': 'anchor', onchange: (e) => {
        const v = e.target.value;
        if (!isDateStr(v) || dowOf(v) !== 7) { e.target.value = testAnchor(s) ?? ''; return toast('일요일만 선택할 수 있습니다'); }
        s.testAnchorDate = v; commit('저장');
      } })),
      h('div', { class: 'muted small' }, s.testAnchorDate ? '' : '미설정 — 시작 주의 일요일 기준'),
      h('div', { class: 'field', style: 'margin-top:10px' }, h('span', null, '헬스장 가능 요일(작전 재편성)'),
        h('div', { class: 'chips', style: 'grid-template-columns:repeat(7,1fr)' }, [1, 2, 3, 4, 5, 6, 7].map((d) => h('button', {
          class: `chip${s.gymDays.includes(d) ? ' on' : ''}`, 'aria-pressed': String(s.gymDays.includes(d)), onclick: () => {
            s.gymDays = s.gymDays.includes(d) ? s.gymDays.filter((x) => x !== d) : [...s.gymDays, d].sort();
            commit(); rerender();
          } }, dowKo(d)))))),

    h('div', { class: 'card' }, label('RATION'),
      h('div', { class: 'grid2' },
        h('div', { class: 'field' }, h('span', null, '단백질 목표 하한'), stepper({ value: s.proteinTarget[0], step: 5, min: 0, max: 400, unit: 'g', label: '하한', onChange: (v) => { s.proteinTarget = [v, Math.max(v, s.proteinTarget[1])]; commit(); } })),
        h('div', { class: 'field' }, h('span', null, '단백질 목표 상한'), stepper({ value: s.proteinTarget[1], step: 5, min: 0, max: 400, unit: 'g', label: '상한', onChange: (v) => { s.proteinTarget = [Math.min(v, s.proteinTarget[0]), v]; commit(); } }))),
      h('div', { class: 'field' }, h('span', null, '단백질 퀵 추가 프리셋'),
        s.proteinPresets.map((p, i) => h('div', { class: 'row', style: 'margin-bottom:6px' },
          h('input', { class: 'grow', value: p.name, style: 'min-height:48px;padding:0 10px;border:1px solid var(--line);background:var(--sunk)', onchange: (e) => { p.name = e.target.value.trim() || p.name; commit('저장'); } }),
          h('input', { type: 'number', inputmode: 'decimal', value: p.g, style: 'width:80px;min-height:48px;padding:0 8px;border:1px solid var(--line);background:var(--sunk)', onchange: (e) => { if (+e.target.value > 0) { p.g = +e.target.value; commit('저장'); } } }),
          h('span', { class: 'small' }, 'g'),
          h('button', { class: 'btn sm danger', 'aria-label': '삭제', onclick: () => { s.proteinPresets.splice(i, 1); commit(); rerender(); } }, '✕'))),
        h('button', { class: 'btn sm block', onclick: () => {
          const name = prompt('프리셋 이름(예: 계란 2개)');
          if (!name) return;
          const g = +prompt('단백질(g)', '12');
          if (!(g > 0)) return toast('g을 숫자로 입력하세요');
          s.proteinPresets.push({ name: name.trim(), g }); commit(); rerender();
        } }, '+ 프리셋 추가'))),

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

    h('div', { class: 'card' }, label('LOCK-SCREEN TIMER'),
      h('p', { class: 'muted small' }, '휴식 시작 시 단축어 앱을 호출해 시계 앱 타이머를 켭니다(잠금화면에서도 울림). 단축어를 먼저 만들어야 합니다 — README 참고.'),
      sw('휴식 시작 시 단축어 호출', s.shortcut.enabled, (v) => { s.shortcut.enabled = v; commit(); }, 'shortcut-toggle'),
      field('단축어 이름', h('input', { value: s.shortcut.name, onchange: (e) => { s.shortcut.name = e.target.value.trim(); commit('저장'); } })),
      h('a', { class: 'btn block', href: shortcutUrl(s.shortcut.name, 90) }, '단축어 테스트(90초)')),

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
        } }))),
      h('div', { class: 'spread', style: 'margin-top:10px' }, h('span', { class: 'small' }, '저장소 영구 보관'), persistEl),
      h('button', { class: 'btn sm block', style: 'margin-top:6px', onclick: async () => { const r = await requestPersist(); toast(r ? '영구 저장 허용됨' : '허용되지 않음(홈 화면 앱에서 다시 시도)'); rerender(); } }, '영구 저장 요청')),

    h('div', { class: 'card' }, label('SYSTEM'),
      h('div', { class: 'spread' }, h('span', null, '앱 버전'), h('span', { class: 'mono' }, APP_VERSION)),
      h('button', { class: 'btn block', style: 'margin-top:8px', onclick: () => checkForUpdate(true) }, '업데이트 확인'),
      h('button', { class: 'btn danger block', style: 'margin-top:8px', onclick: () => {
        if (!confirm('모든 기록과 설정을 지웁니다. 먼저 백업하세요. 계속할까요?')) return;
        if (!confirm('정말 초기화할까요? 되돌릴 수 없습니다.')) return;
        replace(defaultState()); applyTheme(); location.hash = '#setup';
      } }, '데이터 초기화')));
}
