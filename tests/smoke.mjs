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

try {
  await page.goto(BASE);
  await page.waitForURL(/#setup/);
  await shot('setup');
  await page.fill('input[name=callsign]', 'EAGLE');
  assert.equal(await page.inputValue('input[name=startDate]'), '2026-11-02');
  await page.fill('input[name=pullups]', '2');
  await page.fill('input[name=pushups]', '50');
  await page.fill('input[name=situps]', '60');
  await page.fill('input[name=goalPush]', '72');
  await page.fill('input[name=goalSit]', '86');
  await page.click('button[type=submit]');
  await page.waitForURL(/#today/);
  step('첫 실행 설정');

  assert.match(await page.textContent('#callsign'), /EAGLE/);
  assert.match(await page.textContent('#dtg'), /^0218(00|01)I NOV 26$/);
  assert.match(await tid('session-card').textContent(), /상체A/);
  assert.match(await tid('session-card').textContent(), /WEEK 1/);
  assert.match(await tid('mission-card').textContent(), /36/); // 윗몸 60 × 0.6
  await shot('today');
  step('금일 임무: 상체A + 윗몸 36×4 + DTG');

  await tid('pick-LB').click();
  assert.match(await tid('session-card').textContent(), /하체B/);
  await tid('pick-UA').click();

  await tid('start').click();
  await page.waitForURL(/#session/);
  await page.waitForSelector('body.session-mode');
assert.equal(await page.locator('#tabbar').isVisible(), false);
  // 네거티브 풀업 1세트 → 휴식 90초
  await tid('complete').click();
  await tid('rest').waitFor();
  assert.match(await page.textContent('#rest-clock'), /1:30|1:29/);
  await page.locator('#rest button', { hasText: '+15초' }).click();
  assert.match(await page.textContent('#rest-clock'), /1:4[45]/);
  await shot('rest');
  await page.clock.fastForward(106_000);
  assert.match(await page.textContent('.rest-label'), /휴식 종료/);
  step('세트 완료 → 휴식 타이머(±15초) → 종료');

  // 새로고침해도 진행 중 세션 복원
  await page.reload();
  await page.waitForURL(/#session/);
  assert.match(await tid('entry-0').textContent(), /1\/3/);
  step('새로고침 후 진행 중 세션 복원');
  await tid('skip-rest').click();

  // 벤치로 이동 → 대체 종목 왕복 → 60kg 워밍업
  await tid('entry-1').click();
  await tid('swap').click();
  assert.match(await tid('entry-1').textContent(), /스미스 벤치/);
  await tid('swap').click();
  assert.match(await tid('entry-1').textContent(), /바벨 벤치프레스/);
  const plus = tid('entry-1').locator('[data-testid="w"] button[aria-label$="증가"]');
  for (let i = 0; i < 24; i++) await plus.click();
  const warm = await tid('warmup').textContent();
  assert.match(warm, /20kg × 10/);
  assert.match(warm, /30kg × 5/);
  assert.match(warm, /42\.5kg × 3/);
  assert.match(warm, /50kg × 1/);
  await shot('bench-warmup');
  step('대체 종목 교체 + 워밍업 원판 계산');

  for (let s = 0; s < 4; s++) {
    await tid('entry-1').locator('[data-testid="complete"]').click();
    if (await tid('skip-rest').isVisible()) await tid('skip-rest').click();
  }
  assert.match(await tid('entry-1').textContent(), /4\/4/);
  step('벤치 4세트 기록');

  // 60분 가드: 55분 경과로 점프
  await page.clock.fastForward(55 * 60_000);
  await tid('guard-alert').waitFor();
  await shot('guard');
  const before = await page.textContent('#hud-left');
  await tid('trim').click();
  const after = await page.textContent('#hud-left');
  assert.equal(+before - 2, +after); // 슈퍼세트 1라운드(A+B) 감축
  step(`60분 가드 경보 + 마지막 슈퍼세트 감축 (${before}→${after})`);

  await tid('end').click();
  await page.waitForURL(/#summary\//);
  assert.match(await tid('res-bench').textContent(), /60 → 62\.5kg/);
  await tid('neg-easy').check();
  await shot('summary');
  step('작전 종료 → 판정(벤치 60→62.5) → 요약');
  await tid('summary-ok').click();
  await page.waitForURL(/#today/);
  await page.waitForSelector('[data-testid=week4] .done');
  assert.equal(await tid('week4').locator('.done').count(), 1);

  // 일지
  await page.click('#tabbar a[data-tab=log]');
  await page.locator('.log-day').first().click();
  await page.locator('.log-set button', { hasText: '수정' }).first().waitFor();
  await shot('log');
  await page.locator('.chip', { hasText: '종목별' }).click();
  await tid('ex-select').selectOption('bench');
  assert.equal(await page.locator('svg.chart circle').count(), 1);
  step('일지 날짜별/종목별 + SVG 그래프');

  // 검정
  await page.click('#tabbar a[data-tab=test]');
  await tid('t-push').locator('button[aria-label$="증가"]').click();
  await tid('t-save').click();
  assert.match(await page.textContent('table.hist'), /51/);
  step('검정 기록 저장');

  // 설정: 라이트 테마
  await page.click('#tabbar a[data-tab=settings]');
  await tid('theme-light').click();
  assert.equal(await page.getAttribute('html', 'data-theme'), 'light');
  await shot('settings-light');
  await page.click('#tabbar a[data-tab=today]');
  await shot('today-light');
  step('설정: 라이트 테마');

  // 다음 상체A 목표가 미리 채워지는지
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('fitrep')));
  assert.equal(stored.targets.bench.weight, 62.5);
  assert.equal(stored.exState.negPullup.stage, 1);
  assert.equal(stored.schema, 1);

  // 서비스 워커 등록
  const sw = await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()));
  assert.ok(sw, 'SW 등록');
  step('서비스 워커 등록 + 저장 상태 확인');

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
