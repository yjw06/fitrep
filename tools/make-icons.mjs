// icons/icon.svg → PNG 180/192/512 (헤드리스 Chromium으로 렌더). 사용: node tools/make-icons.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const svg = readFileSync(root + 'icons/icon.svg', 'utf8');
const font = readFileSync(root + 'fonts/saira-stencil-one-latin-400.woff2').toString('base64');

const browser = await chromium.launch();
const page = await browser.newPage();
for (const size of [180, 192, 512]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>@font-face{font-family:'Saira Stencil One';src:url(data:font/woff2;base64,${font})}
    html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${root}icons/icon-${size}.png` });
  console.log(`icons/icon-${size}.png`);
}
await browser.close();
