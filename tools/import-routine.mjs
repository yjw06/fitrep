// 루틴 JSON → data/routine.js(앱이 import하는 모듈). 사용: node tools/import-routine.mjs <routine.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateRoutine } from '../js/logic/routine.js';

const src = process.argv[2];
if (!src) {
  console.error('사용: node tools/import-routine.mjs <routine.json>');
  process.exit(1);
}
const routine = JSON.parse(readFileSync(src, 'utf8'));
const problems = validateRoutine(routine);
if (problems.length) {
  console.error(`루틴 형식 문제 ${problems.length}개:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
const out = fileURLToPath(new URL('../data/routine.js', import.meta.url));
writeFileSync(out, `// 루틴 원본 — tools/import-routine.mjs로 생성(${routine.name}, ${routine.updated}).
// 손으로 고치지 말고 JSON을 바꿔 다시 생성할 것. 앱 쪽 보충(대체 종목·로드맵 처방)은 data/program.js
export default ${JSON.stringify(routine, null, 2)};
`);
console.log(`data/routine.js ← ${routine.name} (${routine.days.filter((d) => !d.rest).length}일)`);
