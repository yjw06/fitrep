// FITREP 진입점: 라우터 · 상단 바 · 타이머 틱
import { state, load, loadError } from './store.js';
import { dtg } from './logic/dates.js';
import { $, toast, mount } from './ui/dom.js';
import { setRender } from './ui/nav.js';
import { unlockAudio, keepAwake } from './ui/fx.js';
import { applyTheme, initSW } from './ui/shell.js';
import { renderSetup } from './ui/setup.js';
import { renderToday } from './ui/today.js';
import { renderSession, tick } from './ui/session.js';
import { renderSummary } from './ui/summary.js';
import { renderLog } from './ui/log.js';
import { renderTest } from './ui/test.js';
import { renderSettings } from './ui/settings.js';
import { renderPtTest, ptTick } from './ui/pttest.js';
import { renderSkill, skillTick } from './ui/skill.js';
import { renderInterval, ivTick } from './ui/interval.js';
import { pullupRank, insignia } from './ui/common.js';

load();
applyTheme();

const TABS = { today: 'today', session: 'today', summary: 'today', log: 'log', test: 'test', settings: 'settings', pttest: 'test', skill: 'today', interval: 'today' };
const FOCUS = new Set(['session', 'pttest', 'skill', 'interval']); // 하단 탭 숨기고 화면 켜둠

function route() {
  const [name = 'today', arg] = location.hash.replace(/^#/, '').split('/');
  if (!state.setupDone && name !== 'setup') { location.replace('#setup'); return null; }
  return { name: name || 'today', arg };
}

function render() {
  const r = route();
  if (!r) return;
  const view = $('#view');
  document.body.classList.toggle('session-mode', FOCUS.has(r.name));
  document.querySelectorAll('#tabbar a').forEach((a) => a.classList.toggle('on', a.dataset.tab === TABS[r.name]));
  mount($('#callsign'), state.setupDone ? insignia(pullupRank().rank.bars, 18) : null, state.settings.callsign || 'FITREP');
  if (!FOCUS.has(r.name)) keepAwake(false);
  const views = {
    setup: renderSetup, today: renderToday, session: renderSession, summary: (el) => renderSummary(el, r.arg),
    log: renderLog, test: renderTest, settings: renderSettings,
    pttest: renderPtTest, skill: renderSkill, interval: renderInterval,
  };
  (views[r.name] ?? renderToday)(view);
}

setRender(render);

let lastRoute = null;
window.addEventListener('hashchange', () => {
  render();
  if (location.hash !== lastRoute) window.scrollTo(0, 0);
  lastRoute = location.hash;
});

// 첫 탭에서 오디오 unlock (iOS)
const unlock = () => unlockAudio();
window.addEventListener('pointerdown', unlock, { capture: true });
window.addEventListener('touchend', unlock, { capture: true });

function updateDtg() { $('#dtg').textContent = dtg(); }
updateDtg();
setInterval(updateDtg, 15000);
const TICKS = { '#session': tick, '#pttest': ptTick, '#skill': skillTick, '#interval': ivTick };
setInterval(() => TICKS[location.hash.split('/')[0]]?.(), 250);

// 진행 중 세션 복원: iOS가 앱을 종료해도 상태·휴식 종료 시각으로 이어서
const DRILL_ROUTE = { pttest: '#pttest', skill: '#skill', interval: '#interval' };
if (state.setupDone) {
  if (state.active && !location.hash.startsWith('#session')) location.replace('#session');
  else if (!state.active && state.drill && location.hash !== DRILL_ROUTE[state.drill.type]) location.replace(DRILL_ROUTE[state.drill.type]);
}
lastRoute = location.hash;
render();
if (loadError) toast(`저장 데이터를 읽지 못했습니다: ${loadError.message}`, 5000);

initSW();
