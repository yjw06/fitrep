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
  assert.equal(stored.schema, 2);


  // ───────── 2단계 ─────────
  const nav = async (hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(100); };
  const st = () => page.evaluate(() => JSON.parse(localStorage.getItem('fitrep')));
  await page.locator('#callsign svg.insignia').waitFor();
  step('상단 바 계급장');

  // 체중·단백질
  await nav('#today');
  await tid('bw').locator('button[aria-label$="증가"]').click();
  await tid('bw-save').click();
  await tid('protein-0').click();
  await tid('protein-1').click();
  assert.match(await tid('protein-total').textContent(), /76\.5 \/ 120~150g/);
  assert.equal((await st()).bodyweight[0].kg, 70.1);
  await shot('ration');
  step('체중 기록 + 단백질 퀵 추가(45+31.5)');

  // 화요일로 이동 → 하체A 패스 → 재편성
  await page.clock.fastForward(24 * 3600_000);
  await nav('#log'); await nav('#today');
  assert.match(await tid('session-card').textContent(), /하체A/);
  await tid('pass').click();
  await tid('pass-dialog').locator('button', { hasText: '당직' }).click();
  await tid('resched-card').waitFor();
  await shot('reschedule');
  const opts = await page.locator('[data-testid^="resched-opt-"]').count();
  assert.ok(opts >= 1 && opts <= 3);
  await tid('resched-apply-0').click();
  await tid('resched-applied').waitFor();
  assert.match(await tid('session-card').textContent(), /패스 — 당직/);
  const rs = Object.values((await st()).reschedule)[0];
  assert.deepEqual(rs.applied.assign, { '2026-11-04': 'LA', '2026-11-05': 'UB', '2026-11-06': 'LB' });
  step('패스(당직) → 재배치안 최대 3개 → 적용(수 하체A·목 상체B·금 하체B)');

  // 체력 검정 2분 모드
  await page.click('#tabbar a[data-tab=test]');
  assert.match(await tid('rank-card').textContent(), /이병/);
  await tid('pt-pushups').click();
  await page.waitForURL(/#pttest/);
  await tid('pt-run').waitFor();
  await page.clock.fastForward(3_500);
  await page.clock.fastForward(31_000);
  assert.match(await page.textContent('#pt-target'), /^1[89]$/); // 목표 72 → 30초 누적 18
  await shot('pt-run');
  await page.clock.fastForward(90_000);
  await tid('pt-result').waitFor();
  await tid('pt-save').click();
  await page.waitForURL(/#test/);
  let tests = (await st()).tests;
  assert.equal(tests.find((t) => t.date === '2026-11-03').pushups, 72);
  assert.equal(tests.find((t) => t.date === '2026-11-03').mode, 'timed');
  step('2분 모드: 카운트다운 → 누적 목표 → 결과 저장(timed)');

  // 턱걸이 3개 → 일병 → 상체A 1번 클러스터
  await tid('t-pull').locator('button[aria-label$="증가"]').click();
  await tid('t-save').click();
  await page.waitForSelector('[data-testid=rank-card]:has-text("일병")');
  assert.equal((await st()).tests.filter((t) => t.date === '2026-11-03').length, 1);
  await shot('test-tab');
  await nav('#today');
  await tid('pick-UA').click();
  assert.match(await tid('session-card').textContent(), /클러스터 턱걸이 6×1~2/);
  step('계급 승급(이병→일병) → 상체A 1번 클러스터로 교체');

  // 스킬 데이 가이드(일병 → 사다리 1-2-3 ×2)
  await nav('#skill');
  await tid('skill-card').waitFor();
  assert.equal(await tid('skill-card').locator('.skill-set').count(), 6);
  for (let i = 0; i < 6; i++) await tid('skill-done').click();
  await shot('skill');
  await tid('skill-finish').click();
  await page.waitForURL(/#today/);
  assert.equal((await st()).skillLogs[0].sets.length, 6);
  step('스킬 가이드: 사다리 6세트 → 저장');

  // 400m 인터벌 코치
  await nav('#interval');
  await tid('iv-go').click();
  await tid('iv-card').waitFor();
  await page.clock.fastForward(98_000);
  await tid('iv-lap').click();
  assert.match(await tid('iv-card').textContent(), /WALK/);
  await page.clock.fastForward(91_000);
  await page.waitForSelector('[data-testid=iv-card]:has-text("RUN")');
  assert.match(await page.textContent('body'), /2 \/ 6회/);
  await shot('interval');
  await page.locator('button', { hasText: '중단' }).click();
  await page.waitForURL(/#today/);
  assert.equal((await st()).intervals[0].laps.length, 1);
  step('인터벌: 랩 → 90초 걷기 → 2회차 자동 출발 → 중단 시 랩 저장');

  // 일요일 = 체력 검정일(기준일 미설정 → 시작 주 일요일 11/8)
  await page.clock.fastForward(5 * 24 * 3600_000);
  await nav('#log'); await nav('#today');
  await tid('testday-card').waitFor();
  await shot('testday');
  step('일요일 홈 검정 카드');

  // 서비스 워커 등록
  const sw = await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()));
  assert.ok(sw, 'SW 등록');
  step('서비스 워커 등록 + 저장 상태 확인');


  // v1 저장 데이터 → v2 마이그레이션 로드
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await ctx2.newPage();
  p2.on('pageerror', (e) => errors.push(`[v1] ${e}`));
  await p2.addInitScript(() => {
    if (localStorage.getItem('fitrep')) return;
    localStorage.setItem('fitrep', JSON.stringify({
      schema: 1, setupDone: true,
      settings: { callsign: 'OLDTIMER', startDate: '2026-11-02', goals: { pushups: 70, situps: 80, run3kSec: 750 } },
      tests: [{ id: 'x', date: '2026-11-01', pullups: 7, pushups: 50, situps: 60, mode: 'manual' }],
      sessions: [{ id: 's1', key: 'UA', date: '2026-11-02', week: 1, startedAt: 1, endedAt: 2, entries: [{ slotId: 'UA2', ex: 'bench', presc: { sets: 4, reps: [5, 6] }, sets: [{ w: 60, reps: 6, rir: 2 }] }], results: [] }],
      targets: { bench: { weight: 62.5 } }, exState: {}, missions: {}, reschedule: {},
    }));
  });
  await p2.goto(BASE);
  await p2.waitForSelector('[data-testid=session-card]');
  assert.match(await p2.textContent('#callsign'), /OLDTIMER/);
  const m = await p2.evaluate(() => JSON.parse(localStorage.getItem('fitrep')));
  assert.equal(m.schema, 2);
  assert.equal(m.sessions.length, 1);
  assert.equal(m.settings.goals.pullups, 10);
  await p2.evaluate(() => { location.hash = '#test'; });
  await p2.waitForSelector('[data-testid=rank-card]:has-text("상병")');
  await ctx2.close();
  step('v1 데이터 → v2 마이그레이션(기록 유지, 상병 판정)');

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
