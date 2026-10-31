// FITREP 서비스 워커 — 앱 셸 캐시. 배포마다 CACHE_VERSION을 올린다(js/version.js와 같게).
const CACHE_VERSION = '2.0.0';
const CACHE = `fitrep-${CACHE_VERSION}`;
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './data/program.js',
  './fonts/saira-stencil-one-latin-400.woff2',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/app.js',
  './js/logic/body.js',
  './js/logic/dates.js',
  './js/logic/interval.js',
  './js/logic/missions.js',
  './js/logic/num.js',
  './js/logic/plan.js',
  './js/logic/progression.js',
  './js/logic/pttest.js',
  './js/logic/rank.js',
  './js/logic/reschedule.js',
  './js/logic/schema.js',
  './js/logic/stats.js',
  './js/logic/warmup.js',
  './js/store.js',
  './js/ui/body.js',
  './js/ui/chart.js',
  './js/ui/common.js',
  './js/ui/dom.js',
  './js/ui/fx.js',
  './js/ui/interval.js',
  './js/ui/log.js',
  './js/ui/nav.js',
  './js/ui/pttest.js',
  './js/ui/reschedule.js',
  './js/ui/session.js',
  './js/ui/settings.js',
  './js/ui/setup.js',
  './js/ui/shell.js',
  './js/ui/skill.js',
  './js/ui/summary.js',
  './js/ui/test.js',
  './js/ui/today.js',
  './js/version.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))));
  // 새 버전은 대기 → 앱의 "업데이트" 배너에서 SKIP_WAITING
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('fitrep-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (req.mode === 'navigate') {
      return (await cache.match('./index.html')) ?? fetch(req);
    }
    const hit = await cache.match(req, { ignoreSearch: true });
    return hit ?? fetch(req);
  })());
});
