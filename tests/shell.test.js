// 앱 셸 무결성: SW 캐시 목록·버전, 상대 경로, 모듈 import 대상 존재
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_VERSION } from '../js/version.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
const list = (dir) => readdirSync(join(root, dir), { recursive: true }).filter((f) => /\.(js|css|woff2|png)$/.test(f)).map((f) => `./${join(dir, f)}`);

test('SW 버전 = js/version.js', () => {
  assert.equal(/CACHE_VERSION = '([^']+)'/.exec(sw)[1], APP_VERSION);
});

test('앱 파일이 전부 SW 캐시 목록에 있다', () => {
  const shell = [...sw.matchAll(/'(\.\/[^']*)'/g)].map((m) => m[1]);
  for (const f of [...list('js'), ...list('css'), ...list('data'), ...list('fonts'), ...list('icons')]) {
    assert.ok(shell.includes(f), `${f} 누락`);
  }
  for (const f of shell.filter((f) => f !== './')) assert.ok(existsSync(join(root, f)), `${f} 없음`);
});

test('상대 경로만 사용(Pages 하위 경로 대응)', () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /(href|src)="\//);
  const man = JSON.parse(readFileSync(join(root, 'manifest.webmanifest'), 'utf8'));
  assert.equal(man.start_url, './');
  assert.equal(man.scope, './');
  assert.equal(man.display, 'standalone');
});

test('모든 상대 import 대상이 존재', () => {
  for (const f of list('js')) {
    const src = readFileSync(join(root, f), 'utf8');
    for (const m of src.matchAll(/from '(\.[^']+)'/g)) {
      const target = join(dirname(join(root, f)), m[1]);
      assert.ok(existsSync(target), `${f} → ${relative(root, target)}`);
    }
  }
});
