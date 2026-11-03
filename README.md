# FITREP

주 5회 부위별 루틴 운동 기록·코치 PWA. 빌드 없이 GitHub Pages에서 바로 돌아가고, 한 번 열면 오프라인에서도 동작합니다.
개인 데이터(콜사인·기록·측정 값)는 코드에 없고 전부 기기의 로컬 저장소에만 저장됩니다.

## 1. GitHub Pages 켜기
1. 레포 **Settings → Pages**
2. **Build and deployment → Source: Deploy from a branch**
3. **Branch: `main` / `/ (root)`** → Save
4. 1~2분 뒤 `https://<사용자명>.github.io/<레포명>/` 에서 열림

## 2. 아이폰 홈 화면에 설치
1. **Safari**로 위 주소를 연다(다른 브라우저 X)
2. 하단 **공유 버튼 → 홈 화면에 추가 → 추가**
3. 홈 화면의 **FITREP** 아이콘으로 실행(전체 화면, 오프라인 동작)

> ⚠️ **홈 화면 앱과 Safari 탭은 저장소가 따로입니다.** Safari에서 입력한 기록은 홈 화면 앱에 보이지 않습니다.
> 처음부터 홈 화면 앱에서 설정하고, 옮겨야 하면 아래 *백업*으로 내보내기 → 가져오기 하세요.

## 3. 백업
- **설정 → BACKUP → 내보내기**: 공유 시트가 뜨면 *파일에 저장* 또는 메일/메신저로 보관(공유 미지원 시 파일 다운로드)
- **가져오기**: 백업 JSON 파일을 선택 → 확인하면 현재 데이터를 덮어씁니다
- 주 1회 정도 백업 권장(iOS가 오래 안 쓴 웹 앱 저장소를 정리할 수 있음)

## 쓰는 법 요약
- **임무**: 오늘 요일의 세션(월 가슴+복근 / 화 등 / 수 어깨 / 목 하체 / 금 팔+복근) + 이번 주 진행. 다른 날 세션은 칩으로 고르고, 삼두 쓰는 가슴·어깨·팔이 연달아면 경고
- **작전 개시** → 종목 순서대로 무게(±2.5)·반복(±1)·RIR 기록 → 세트 완료 시 휴식 타이머 자동 시작. 값 부분을 누르면 직접 입력. 첫 무게는 루틴의 시작 무게
- 1주차는 RIR 3으로 무게 탐색 — **4+**(3개 넘게 남음)를 누르면 다음 세트 무게가 올라감
- 메인 리프트 첫 세트 전 워밍업(원판 구성 포함), 60분 초과 예상 시 경보 + 마지막 슈퍼세트 감축
- **작전 종료** → 판정 → 다음 목표(수정 가능)가 다음 세션에 미리 채워짐
- **검정**: 격주 일요일 정자세 턱걸이 최대 → 로드맵 단계에 따라 화·금 1번 종목이 바뀜
- **운동 초기화**(설정 → RESET): 설정은 그대로 두고 헬스·측정 기록을 골라 지운 뒤 1주차부터 다시 시작. 설정까지 지우려면 전체 초기화

## 개발
- 의존성 없음(Vanilla ES modules). 명세·진행 상황은 [`CLAUDE.md`](CLAUDE.md)
- **루틴 바꾸기**: 루틴 JSON(schemaVersion 1)을 받아 `node tools/import-routine.mjs <루틴.json>` → 형식 점검 후 `data/routine.js` 생성. 메모에만 있는 대체 종목·턱걸이 로드맵 처방은 `data/program.js`
- 로직 테스트: `npm test` (node:test, `js/logic/` 순수 함수)
- 화면 스모크: `npm run smoke` (로컬 서버 `/fitrep/` 하위 + 헤드리스 Chromium, `-- --shots`로 `tests/shots/`에 스크린샷)
- 로컬 실행: `npm run serve` → http://localhost:8080/fitrep/
- 아이콘 재생성: `npm run icons` (`icons/icon.svg` → PNG 180/192/512)
- **배포할 때마다 `sw.js`의 `CACHE_VERSION`과 `js/version.js`를 같이 올리기** → 앱에 "업데이트" 배너가 뜸

## 라이선스
- 코드: [MIT](LICENSE) — Copyright (c) 2026 yjw06
- 폰트: Saira Stencil One — [SIL Open Font License 1.1](fonts/OFL.txt) (출처: [`fonts/SOURCE.md`](fonts/SOURCE.md))
