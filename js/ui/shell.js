// 앱 껍데기: 테마, 서비스 워커 등록 + 업데이트 배너
import { h, toast } from './dom.js';
import { state } from '../store.js';

export function applyTheme() {
  const t = state.settings.theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#E6DFC4' : '#14170F');
}

let reg = null;

function showUpdate(worker) {
  const b = document.getElementById('banner');
  b.replaceChildren(
    h('span', null, '새 버전이 있습니다'),
    h('button', { class: 'btn sm primary', 'data-testid': 'update', onclick: () => {
      worker.postMessage({ type: 'SKIP_WAITING' });
      b.hidden = true;
    } }, '업데이트'));
  b.hidden = false;
}

function watch(worker) {
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate(worker);
  });
}

export async function initSW() {
  if (!('serviceWorker' in navigator)) return;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
  try {
    reg = await navigator.serviceWorker.register('sw.js');
    if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);
    if (reg.installing) watch(reg.installing);
    reg.addEventListener('updatefound', () => watch(reg.installing));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  } catch (e) {
    console.warn('SW 등록 실패', e);
  }
}

export async function checkForUpdate(manual = false) {
  if (!reg) return manual && toast('서비스 워커 없음(오프라인 캐시 미사용)');
  try {
    await reg.update();
    if (reg.waiting) showUpdate(reg.waiting);
    else if (manual) toast(reg.installing ? '새 버전 내려받는 중…' : '최신 버전입니다');
  } catch {
    if (manual) toast('확인 실패 — 오프라인?');
  }
}
