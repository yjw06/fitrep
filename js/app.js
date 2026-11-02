// FITREP 진입점: 라우터 · 상단 바 · 타이머 틱
import { state, load, loadError } from './store.js';
import { dtg } from './logic/dates.js';
import { $, toast } from './ui/dom.js';
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

load();
applyTheme();

const TABS = { today: 'today', session: 'today', summary: 'today', log: 'log', test: 'test', settings: 'settings' };

function route() {
  const [name = 'today', arg] = location.hash.replace(/^#/, '').split('/');
  if (!state.setupDone && name !== 'setup') { location.replace('#setup'); return null; }
  return { name: name || 'today', arg };
}

function render() {
  const r = route();
  if (!r) return;
  const view = $('#view');
  document.body.classList.toggle('session-mode', r.name === 'session');
  document.querySelectorAll('#tabbar a').forEach((a) => a.classList.toggle('on', a.dataset.tab === TABS[r.name]));
  $('#callsign').textContent = state.settings.callsign || 'FITREP';
  if (r.name !== 'session') keepAwake(false);
  const views = {
    setup: renderSetup, today: renderToday, session: renderSession, summary: (el) => renderSummary(el, r.arg),
    log: renderLog, test: renderTest, settings: renderSettings,
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
setInterval(() => { if (location.hash.startsWith('#session')) tick(); }, 250);

// 진행 중 세션 복원: iOS가 앱을 종료해도 상태·휴식 종료 시각으로 이어서
if (state.setupDone && state.active && !location.hash.startsWith('#session')) location.replace('#session');
lastRoute = location.hash;
render();
if (loadError) toast(`저장 데이터를 읽지 못했습니다: ${loadError.message}`, 5000);

initSW();
