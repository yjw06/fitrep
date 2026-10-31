// 소리(Web Audio)·음성(speechSynthesis)·화면 꺼짐 방지(Wake Lock)·단축어 호출. 진동 API는 쓰지 않는다(iOS 미지원).
let ctx = null;

// 첫 사용자 탭에서 호출 — iOS는 제스처 안에서만 오디오가 풀린다
export function unlockAudio() {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* 미지원 */ }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === 'suspended') ctx.resume();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf; src.connect(ctx.destination); src.start(0);
  } catch { /* 무시 */ }
  try {
    if ('speechSynthesis' in window && !unlockAudio.spoken) {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0; speechSynthesis.speak(u);
      unlockAudio.spoken = true;
    }
  } catch { /* 무시 */ }
}

export function beep({ freq = 880, dur = 0.16, at = 0, vol = 0.5 } = {}) {
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'square'; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

export function speak(text) {
  try {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR'; u.rate = 1.05;
    const ko = speechSynthesis.getVoices().find((v) => v.lang?.startsWith('ko'));
    if (ko) u.voice = ko;
    speechSynthesis.speak(u);
  } catch { /* 무시 */ }
}

// ── Wake Lock ──
let lock = null, wanted = false;
async function acquire() {
  try {
    if (!wanted || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    if (lock && !lock.released) return;
    lock = await navigator.wakeLock.request('screen');
  } catch { /* 저전력 모드 등 */ }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') acquire(); });

export function keepAwake(on) {
  wanted = on;
  if (on) acquire();
  else if (lock) { lock.release().catch(() => {}); lock = null; }
}

// 잠금화면에서도 울리는 시계 타이머: 단축어 앱 호출(설정 옵션)
export function shortcutUrl(name, seconds) {
  return `shortcuts://run-shortcut?name=${encodeURIComponent(name)}&input=text&text=${Math.round(seconds)}`;
}
export function runShortcut(name, seconds) {
  location.href = shortcutUrl(name, seconds);
}
