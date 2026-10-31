// localStorage 저장소 (스키마 버전 + 마이그레이션은 logic/schema.js)
import { migrate, defaultState, makeBackup, readBackup } from './logic/schema.js';
import { todayStr } from './logic/dates.js';

const KEY = 'fitrep';
export let state = defaultState();
export let loadError = null;

export function load() {
  const raw = localStorage.getItem(KEY);
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    state = migrate(parsed);
    if (parsed && parsed.schema !== state.schema) save(); // 마이그레이션 결과 바로 저장
  } catch (e) {
    loadError = e;
    // 읽을 수 없는 데이터는 지우지 않고 옆에 보관
    if (raw) localStorage.setItem(`${KEY}.unreadable.${Date.now()}`, raw);
    state = defaultState();
  }
  return state;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export function replace(next) {
  state = next;
  save();
}

export async function requestPersist() {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch { return null; }
}

export async function isPersisted() {
  try { return navigator.storage?.persisted ? await navigator.storage.persisted() : null; } catch { return null; }
}

// 백업 내보내기: navigator.share(파일) 우선, 실패하면 다운로드
export async function exportBackup() {
  const name = `fitrep-backup-${todayStr()}.json`;
  const json = JSON.stringify(makeBackup(state), null, 1);
  const file = new File([json], name, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'FITREP 백업' });
      return 'shared';
    }
  } catch (e) {
    if (e?.name === 'AbortError') return 'cancelled';
  }
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}

export async function importBackupFile(file) {
  return readBackup(await file.text());
}
