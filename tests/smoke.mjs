// 화면 스모크 테스트: 로컬 서버(/fitrep/ 하위) + 헤드리스 Chromium(아이폰 크기).
// 사용: node tests/smoke.mjs [--shots]  (스크린샷은 tests/shots/ — git 제외)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { serve } from '../tools/serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const shots = process.argv.includes('--shots');
const shotDir = fileURLToPath(new URL('./shots/', import.meta.url));
if (shots) mkdirSync(shotDir, { recursive: true });

const PORT = 8765;
const server = await serve({ port: PORT, base: '/fitrep/' });
const BASE = `http://localhost:${PORT}/fitrep/`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('dialog', (d) => d.accept());

// 2026-11-02(월) 18:00 KST
await page.clock.install({ time: new Date('2026-11-02T09:00:00Z') });
await page.clock.resume(); // 시간은 흐르게(스크린샷·rAF), 필요할 때 fastForward

let n = 0;
const shot = async (name) => {
  if (!shots) return;
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${shotDir}${String(++n).padStart(2, '0')}-${name}.png`, fullPage: true, timeout: 8000 }).catch((e) => console.warn(`(스크린샷 실패: ${name})`, e.message.split('\n')[0]));
};
const step = (msg) => console.log(`✓ ${msg}`);
const tid = (id) => page.locator(`[data-testid="${id}"]`);

const st = () => page.evaluate(() => JSON.parse(localStorage.getItem('fitrep')));
const nav = async (hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(100); };

try {
  // ── 첫 실행 설정 ──
  await page.goto(BASE);
  await page.waitForURL(/#setup/);
  await shot('setup');
  await page.fill('input[name=callsign]', 'EAGLE');
  assert.equal(await page.inputValue('input[name=startDate]'), '2026-11-02');
  await page.fill('input[name=pullups]', '2');
  await page.click('button[type=submit]');
  await page.waitForURL(/#today/);
  step('첫 실행 설정(콜사인·시작일·턱걸이 최대)');

  // ── 금일 임무 ──
  assert.match(await page.textContent('#callsign'), /EAGLE/);
  assert.match(await page.textContent('#dtg'), /^0218(00|01)I NOV 26$/);
  assert.match(await tid('session-card').textContent(), /상체A/);
  assert.match(await tid('session-card').textContent(), /WEEK 1/);
  assert.equal(await page.locator('text=PT MISSION').count(), 0);
  await tid('pick-LB').click();
  assert.match(await tid('session-card').textContent(), /하체B/);
  await tid('pick-UA').click();
  await shot('today');
  step('금일 임무: 월 상체A + 수동 선택 + DTG');

  // ── 세션: 세트 완료 → 휴식 타이머 ──
  await tid('start').click();
  await page.waitForURL(/#session/);
  await page.waitForSelector('body.session-mode');
  assert.equal(await page.locator('#tabbar').isVisible(), false);
  await tid('complete').click();
  await tid('rest').waitFor();
  assert.match(await page.textContent('#rest-clock'), /1:30|1:29/);
  await page.locator('#rest button', { hasText: '+15초' }).click();
  assert.match(await page.textContent('#rest-clock'), /1:4[45]/);
  await shot('rest');
  await page.clock.fastForward(106_000);
  assert.match(await page.textContent('.rest-label'), /휴식 종료/);
  step('세트 완료 → 휴식 타이머(±15초) → 종료');

  await page.reload();
  await page.waitForURL(/#session/);
  assert.match(await tid('entry-0').textContent(), /1\/3/);
  await tid('skip-rest').click();
  step('새로고침 후 진행 중 세션 복원');

  // ── 벤치: 대체 종목 왕복 → 워밍업 → 4세트 ──
  await tid('entry-1').click();
  await tid('swap').click();
  assert.match(await tid('entry-1').textContent(), /스미스 벤치/);
  await tid('swap').click();
  assert.match(await tid('entry-1').textContent(), /바벨 벤치프레스/);
  const plus = tid('entry-1').locator('[data-testid="w"] button[aria-label$="증가"]');
  for (let i = 0; i < 24; i++) await plus.click();
  const warm = await tid('warmup').textContent();
  for (const re of [/20kg × 10/, /30kg × 5/, /42\.5kg × 3/, /50kg × 1/]) assert.match(warm, re);
  await shot('bench-warmup');
  for (let k = 0; k < 4; k++) {
    await tid('entry-1').locator('[data-testid="complete"]').click();
    if (await tid('skip-rest').isVisible()) await tid('skip-rest').click();
  }
  assert.match(await tid('entry-1').textContent(), /4\/4/);
  step('대체 종목 교체 + 워밍업 원판 계산 + 벤치 4세트');

  // ── 60분 가드 ──
  await page.clock.fastForward(55 * 60_000);
  await tid('guard-alert').waitFor();
  await shot('guard');
  const leftBefore = +(await page.textContent('#hud-left'));
  await tid('trim').click();
  const leftAfter = +(await page.textContent('#hud-left'));
  assert.equal(leftBefore - 2, leftAfter); // 슈퍼세트 1라운드(A+B)
  step(`60분 가드 경보 + 마지막 슈퍼세트 감축 (${leftBefore}→${leftAfter})`);

  // ── 종료 → 판정 → 요약 ──
  await tid('end').click();
  await page.waitForURL(/#summary\//);
  assert.match(await tid('res-bench').textContent(), /60 → 62\.5kg/);
  await tid('neg-easy').check();
  await shot('summary');
  await tid('summary-ok').click();
  await page.waitForURL(/#today/);
  await page.waitForSelector('[data-testid=week4] .done');
  step('작전 종료 → 판정(벤치 60→62.5) → 요약 → 이번 주 1/4');

  // ── 요일 변경 규칙 경고: 오늘 상체A를 했는데 상체B를 고르면 ──
  await tid('pick-UB').click();
  assert.match(await tid('pick-warn').textContent(), /상체끼리 48시간 안 됨 — 오늘 상체A/);
  await tid('pick-LA').click();
  assert.equal(await tid('pick-warn').count(), 0);
  step('요일 변경 규칙 경고(상체끼리 48시간)');

  // ── 일지 ──
  await page.click('#tabbar a[data-tab=log]');
  await page.locator('.log-day').first().click();
  await page.locator('.log-set button', { hasText: '수정' }).first().waitFor();
  await shot('log');
  await page.locator('.chip', { hasText: '종목별' }).click();
  await tid('ex-select').selectOption('bench');
  assert.equal(await page.locator('svg.chart circle').count(), 1);
  step('일지 날짜별/종목별 + SVG 그래프');

  // ── 측정: 턱걸이 3개 → 단계 올라감, 같은 날 기록 병합 ──
  await page.click('#tabbar a[data-tab=test]');
  await tid('t-pull').locator('button[aria-label$="증가"]').click();
  await tid('t-save').click();
  await page.waitForSelector('[data-testid=chart-pullups]');
  let s1 = await st();
  assert.equal(s1.tests.length, 1);
  assert.equal(s1.tests[0].pullups, 3);
  assert.equal(s1.tests[0].pushups, null);
  await shot('test-tab');
  step('턱걸이 측정 기록(같은 날 병합, 팔굽·윗몸은 선택)');

  // ── 설정: 라이트 테마 ──
  await page.click('#tabbar a[data-tab=settings]');
  await tid('theme-light').click();
  assert.equal(await page.getAttribute('html', 'data-theme'), 'light');
  await shot('settings-light');
  step('설정: 라이트 테마');

  s1 = await st();
  assert.equal(s1.targets.bench.weight, 62.5);
  assert.equal(s1.exState.negPullup.stage, 1);
  assert.equal(s1.schema, 5);
  for (const k of ['missions', 'skillLogs', 'intervals', 'drill', 'reschedule']) assert.equal(k in s1, false, k);

  // ── 격주 일요일 측정 카드 ──
  await page.clock.fastForward(6 * 24 * 3600_000);
  await nav('#log'); await nav('#today');
  await tid('testday-card').waitFor();
  await shot('testday');
  step('격주 일요일 턱걸이 측정 카드');

  // ── 운동 초기화: 헬스 기록만 지우고 다음 월요일부터 1주차 (지금은 11/8 일요일) ──
  await page.click('#tabbar a[data-tab=settings]');
  await tid('reset-open').click();
  await tid('reset-dialog').waitFor();
  assert.equal(await tid('reset-start').inputValue(), '2026-11-09');
  assert.equal(await tid('reset-gym').isChecked(), true);
  assert.equal(await tid('reset-tests').isChecked(), false);
  await shot('reset');
  await tid('reset-go').click();
  await page.waitForURL(/#today/);
  const post = await st();
  assert.deepEqual([post.sessions.length, Object.keys(post.targets).length, Object.keys(post.exState).length], [0, 0, 0]);
  assert.equal(post.tests.length, 1);
  assert.equal(post.settings.callsign, 'EAGLE');
  assert.equal(post.settings.theme, 'light');
  assert.equal(post.settings.startDate, '2026-11-09');
  await page.waitForSelector('text=작전 개시 D-1');
  step('운동 초기화: 헬스 기록만 삭제(설정·측정 유지) → 11/9부터 1주차');

  const sw = await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()));
  assert.ok(sw, 'SW 등록');
  step('서비스 워커 등록');

  // ── 이전 버전(schema 4) 저장 데이터 → v5 ──
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await ctx2.newPage();
  p2.on('pageerror', (e) => errors.push(`[v4] ${e}`));
  await p2.addInitScript(() => {
    if (localStorage.getItem('fitrep')) return;
    localStorage.setItem('fitrep', JSON.stringify({
      schema: 4, setupDone: true,
      settings: { callsign: 'OLDTIMER', startDate: '2026-11-02', goals: { pullups: 10, pushups: 70 }, shortcut: { enabled: true, name: 'x' }, gymDays: [1, 2], alts: { 'UB3.0': 'lowPulleyRow' } },
      tests: [{ id: 'x', date: '2026-11-01', pullups: 7, pushups: 50, situps: 60, mode: 'timed' }],
      sessions: [{ id: 's1', key: 'UA', date: '2026-11-02', week: 1, startedAt: 1, endedAt: 2, entries: [{ slotId: 'UA2', ex: 'bench', presc: { sets: 4, reps: [5, 6] }, sets: [{ w: 60, reps: 6, rir: 2 }] }], results: [] }],
      targets: { bench: { weight: 62.5 } }, exState: {},
      missions: { '2026-11-02': { status: 'done' } }, skillLogs: [{ date: '2026-11-04' }], intervals: [], reschedule: {}, drill: { type: 'skill' },
    }));
  });
  await p2.goto(BASE);
  await p2.waitForSelector('[data-testid=session-card]');
  assert.match(await p2.textContent('#callsign'), /OLDTIMER/);
  const m = await p2.evaluate(() => JSON.parse(localStorage.getItem('fitrep')));
  assert.equal(m.schema, 5);
  assert.equal(m.sessions.length, 1);
  assert.equal(m.targets.bench.weight, 62.5);
  for (const k of ['missions', 'skillLogs', 'intervals', 'drill', 'reschedule']) assert.equal(k in m, false, k);
  for (const k of ['goals', 'shortcut', 'gymDays']) assert.equal(k in m.settings, false, k);
  assert.deepEqual(m.settings.alts, {});
  await ctx2.close();
  step('이전 데이터(schema 4) → v5: 빠진 기능 저장값 제거, 기록 유지');

  assert.deepEqual(errors, []);
  console.log('\nSMOKE OK');
} catch (e) {
  await shot('FAIL');
  console.error(e);
  if (errors.length) console.error('page errors:', errors);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
