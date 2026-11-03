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
const wval = (entry) => tid(entry).locator('[data-testid="w"] .val b').textContent();

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

  // ── 금일 임무: 월 = 가슴 + 복근 ──
  assert.match(await page.textContent('#callsign'), /EAGLE/);
  assert.match(await page.textContent('#dtg'), /^0218(00|01)I NOV 26$/);
  const card = await tid('session-card').textContent();
  for (const re of [/가슴 \+ 복근/, /WEEK 1/, /약 55분/, /바벨 벤치프레스/, /펙덱 플라이/, /스미스 벤치로 대체/]) assert.match(card, re);
  assert.equal(await page.locator('[data-testid^="pick-"]').count(), 5);
  await tid('pick-tue').click();
  assert.match(await tid('session-card').textContent(), /컨벤셔널 데드리프트/);
  await tid('pick-mon').click();
  assert.equal(await tid('week-cells').locator('> div').count(), 5);
  await shot('today');
  step('금일 임무: 월 가슴+복근, 요일 5칸, 수동 선택');

  // ── 세션: 일반 워밍업 → 벤치(시작 무게 40kg) 워밍업 ──
  await tid('start').click();
  await page.waitForURL(/#session/);
  await page.waitForSelector('body.session-mode');
  assert.match(await tid('gw-card').textContent(), /가벼운 랫풀다운 15회/);
  await tid('gw-done').click();
  assert.equal(await tid('gw-card').count(), 0);
  assert.equal(await wval('entry-0'), '40');
  const warm = await tid('warmup').textContent();
  for (const re of [/20kg × 10/, /27\.5kg × 3/, /35kg × 1/]) assert.match(warm, re);
  assert.doesNotMatch(warm, /20kg × 5/); // 50% = 20kg(빈봉 이하) 생략
  assert.match(await tid('entry-0').textContent(), /강도 메인/);
  await shot('bench-warmup');
  step('일반 워밍업 카드 + 벤치 시작 무게 40kg + 워밍업 원판 계산');

  // ── 1주차: RIR 4+ → 다음 세트 무게 올림, 휴식 타이머 ──
  await tid('entry-0').locator('[data-testid="rir"] button', { hasText: '4+' }).click();
  await tid('complete').click();
  await tid('rest').waitFor();
  assert.match(await page.textContent('#toast'), /3개 넘게 남음 → 다음 세트 \+2\.5kg/);
  assert.match(await page.textContent('#rest-clock'), /2:30|2:29/);
  await page.locator('#rest button', { hasText: '+15초' }).click();
  assert.match(await page.textContent('#rest-clock'), /2:4[45]/);
  await shot('rest');
  await page.clock.fastForward(166_000);
  assert.match(await page.textContent('.rest-label'), /휴식 종료/);
  step('1주차 RIR 4+ → 다음 세트 +2.5kg, 휴식 타이머(±15초) → 종료');

  await page.reload();
  await page.waitForURL(/#session/);
  assert.match(await tid('entry-0').textContent(), /1\/4/);
  await tid('skip-rest').click();
  assert.equal(await wval('entry-0'), '42.5');
  step('새로고침 후 진행 중 세션 복원(올린 무게 유지)');

  // ── 대체 종목: 딥스 ↔ 케이블 플라이(자기 처방 3×12~15) ──
  await tid('entry-2').click();
  await tid('entry-2').locator('[data-testid="swap"]').click();
  let dip = await tid('entry-2').textContent();
  assert.match(dip, /싱글암 하이투로우 케이블 플라이/);
  assert.match(dip, /3×12~15/);
  await tid('entry-2').locator('[data-testid="swap"]').click();
  dip = await tid('entry-2').textContent();
  assert.match(dip, /어시스트 딥스/);
  assert.match(dip, /3×8~10/);
  assert.match(dip, /보조 무게/);
  step('대체 종목 교체: 딥스 ↔ 케이블 플라이(처방도 바뀜)');

  // ── 벤치 나머지 3세트 ──
  await tid('entry-0').click();
  for (let k = 0; k < 3; k++) {
    await tid('entry-0').locator('[data-testid="complete"]').click();
    if (await tid('skip-rest').isVisible()) await tid('skip-rest').click();
  }
  assert.match(await tid('entry-0').textContent(), /4\/4/);

  // ── 슈퍼세트: 플라이 → 펙덱(사이 휴식 없음) ──
  await tid('entry-3').click();
  assert.match(await tid('entry-3').textContent(), /RIR 3/); // 1주차는 고립도 RIR 3
  await tid('entry-3').locator('[data-testid="complete"]').click();
  assert.equal(await tid('rest').count(), 0);
  assert.match(await page.locator('.active-card').textContent(), /펙덱 플라이/);
  step('벤치 4세트 + 슈퍼세트 A→B 사이 휴식 없음');

  // ── 60분 가드 ──
  await page.clock.fastForward(55 * 60_000);
  await tid('guard-alert').waitFor();
  await shot('guard');
  const leftBefore = +(await page.textContent('#hud-left'));
  assert.match(await tid('trim').textContent(), /마지막 슈퍼세트 1세트 감축/);
  await tid('trim').click();
  const leftAfter = +(await page.textContent('#hud-left'));
  assert.equal(leftBefore - 2, leftAfter);
  step(`60분 가드 경보 + 마지막 슈퍼세트 감축 (${leftBefore}→${leftAfter})`);

  // ── 종료 → 판정 → 요약 ──
  await tid('end').click();
  await page.waitForURL(/#summary\//);
  assert.match(await tid('res-bench_press').textContent(), /42\.5 → 45kg/);
  await shot('summary');
  await tid('summary-ok').click();
  await page.waitForURL(/#today/);
  await page.waitForSelector('[data-testid=week-cells] .done');
  step('작전 종료 → 판정(벤치 42.5→45) → 요약 → 이번 주 1/5');

  // ── 요일 바꿀 때: 삼두 쓰는 가슴·어깨·팔 연달아 경고 ──
  await tid('pick-wed').click();
  assert.match(await tid('pick-warn').textContent(), /삼두를 같이 쓰는 날 연달아 — 오늘 가슴 \+ 복근/);
  await tid('pick-tue').click();
  assert.equal(await tid('pick-warn').count(), 0);
  step('요일 변경 경고(삼두 쓰는 날 연달아)');

  // ── 일지 ──
  await page.click('#tabbar a[data-tab=log]');
  await page.locator('.log-day').first().click();
  await page.locator('.log-set button', { hasText: '수정' }).first().waitFor();
  await shot('log');
  await page.locator('.chip', { hasText: '종목별' }).click();
  await tid('ex-select').selectOption('bench_press');
  assert.equal(await page.locator('svg.chart circle').count(), 1);
  step('일지 날짜별/종목별 + SVG 그래프');

  // ── 측정: 턱걸이 3개 → 2단계, 화·금 1번 교체 ──
  await page.click('#tabbar a[data-tab=test]');
  assert.match(await tid('stage-card').textContent(), /1단계/);
  assert.match(await tid('stage-card').textContent(), /네거티브 풀업/);
  await tid('t-pull').locator('button[aria-label$="증가"]').click();
  await tid('t-save').click();
  await page.waitForSelector('[data-testid=stage-card]:has-text("2단계")');
  const stage = await tid('stage-card').textContent();
  assert.match(stage, /등 1번 클러스터 턱걸이 6×1~2/);
  assert.match(stage, /팔 1번 친업 클러스터 5×1~2/);
  let s1 = await st();
  assert.equal(s1.tests.length, 1);
  assert.equal(s1.tests[0].pullups, 3);
  await shot('test-tab');
  await nav('#today');
  await tid('pick-thu').click(); // 앞에서 고른 화요일을 다시 누르면 선택이 풀리므로 다른 날을 거쳐서
  await tid('pick-tue').click();
  assert.match(await tid('session-card').textContent(), /클러스터 턱걸이 6×1~2/);
  assert.match(await tid('session-card').textContent(), /턱걸이 2단계/);
  step('턱걸이 측정(같은 날 병합) → 2단계 → 화·금 1번 교체');

  // ── 설정 ──
  await page.click('#tabbar a[data-tab=settings]');
  await page.waitForSelector('text=머신·케이블 한 칸');
  await tid('theme-light').click();
  assert.equal(await page.getAttribute('html', 'data-theme'), 'light');
  await shot('settings-light');
  step('설정: 증가폭 기준 + 라이트 테마');

  s1 = await st();
  assert.equal(s1.targets.bench_press.weight, 45);
  assert.equal(s1.schema, 6);

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
  assert.equal(await tid('reset-tests').isChecked(), false);
  await tid('reset-go').click();
  await page.waitForURL(/#today/);
  const post = await st();
  assert.deepEqual([post.sessions.length, Object.keys(post.targets).length], [0, 0]);
  assert.equal(post.tests.length, 1);
  assert.deepEqual([post.settings.callsign, post.settings.theme, post.settings.startDate], ['EAGLE', 'light', '2026-11-09']);
  await page.waitForSelector('text=작전 개시 D-1');
  step('운동 초기화: 헬스 기록만 삭제(설정·측정 유지) → 11/9부터 1주차');

  assert.ok(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())), 'SW 등록');
  step('서비스 워커 등록');

  // ── 지금 폰에 있을 데이터(v2.3.0, schema 4 · 옛 종목 id) → v6 ──
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await ctx2.newPage();
  p2.on('pageerror', (e) => errors.push(`[v4] ${e}`));
  await p2.addInitScript(() => {
    if (localStorage.getItem('fitrep')) return;
    localStorage.setItem('fitrep', JSON.stringify({
      schema: 4, setupDone: true,
      settings: { callsign: 'OLDTIMER', startDate: '2026-11-02', goals: { pullups: 10 }, shortcut: { enabled: true, name: 'x' }, gymDays: [1, 2], alts: { 'UA2.0': 'smithBench' }, inc: { mainUpper: 2.5, mainLower: 5, barbell: 2.5, smith: 2.5, dumbbell: 2, machine: 5, cable: 5, assist: 5 }, incOverride: {} },
      tests: [{ id: 'x', date: '2026-11-01', pullups: 7, pushups: 50, situps: 60, mode: 'timed' }],
      sessions: [{ id: 's1', key: 'UA', date: '2026-11-02', week: 1, startedAt: 1, endedAt: 2, entries: [
        { slotId: 'UA1', ex: 'negPullup', presc: { sets: 3, reps: [3, 3] }, sets: [{ w: 0, reps: 3, rir: null }] },
        { slotId: 'UA2', ex: 'bench', presc: { sets: 4, reps: [5, 6] }, sets: [{ w: 40, reps: 6, rir: 3 }] }], results: [] }],
      targets: { bench: { weight: 42.5 } }, exState: { negPullup: { stage: 1 } },
      missions: { '2026-11-02': { status: 'done' } }, skillLogs: [], intervals: [], reschedule: {}, drill: null,
    }));
  });
  await p2.goto(BASE);
  await p2.waitForSelector('[data-testid=session-card]');
  assert.match(await p2.textContent('#callsign'), /OLDTIMER/);
  const m = await p2.evaluate(() => JSON.parse(localStorage.getItem('fitrep')));
  assert.equal(m.schema, 6);
  assert.deepEqual(m.sessions[0].entries.map((e) => e.ex), ['negative_pullup', 'bench_press']);
  assert.equal(m.targets.bench_press.weight, 42.5);
  assert.equal(m.exState.negative_pullup.stage, 1);
  for (const k of ['missions', 'skillLogs', 'intervals', 'drill', 'reschedule']) assert.equal(k in m, false, k);
  assert.deepEqual(m.settings.inc, { machine: 5, dumbbell: 2, assist: 5 });
  await p2.evaluate(() => { location.hash = '#log'; });
  await p2.locator('.log-day').first().click();
  assert.match(await p2.textContent('#view'), /상체A/);
  assert.match(await p2.textContent('#view'), /바벨 벤치프레스/);
  await ctx2.close();
  step('지금 폰 데이터(v2.3.0) → v6: 종목 id 변환(벤치 다음 목표 42.5 유지), 지난 기록 표시');

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
