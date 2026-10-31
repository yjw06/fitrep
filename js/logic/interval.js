// 400m 인터벌 코치 상태 기계 (순수 함수, Date.now 기준 시각을 저장 → 복원 가능)
// drill: { type:'interval', pace, reps, walkSec, cueAt, rep(0부터), phase:'run'|'walk'|'done', phaseStart, laps:[초], cued }

export function startInterval({ pace, reps, walkSec, cueAt = 0.5 }, now) {
  return { type: 'interval', pace, reps, walkSec, cueAt, rep: 0, phase: 'run', phaseStart: now, laps: [], cued: false };
}

export function lapInterval(d, now) {
  if (d.phase !== 'run') return d;
  const lap = Math.round((now - d.phaseStart) / 100) / 10;
  const laps = [...d.laps, lap];
  if (laps.length >= d.reps) return { ...d, laps, phase: 'done', phaseStart: now };
  return { ...d, laps, phase: 'walk', phaseStart: now };
}

// 걷기 시간이 끝났으면 다음 달리기로(앱이 늦게 깨어나도 걷기 종료 시각부터 계산)
export function advanceInterval(d, now) {
  if (d.phase !== 'walk') return d;
  const end = d.phaseStart + d.walkSec * 1000;
  if (now < end) return d;
  return { ...d, phase: 'run', rep: d.rep + 1, phaseStart: end, cued: false };
}

export function intervalView(d, now) {
  const elapsed = (now - d.phaseStart) / 1000;
  return {
    phase: d.phase,
    rep: d.rep,
    elapsed: d.phase === 'run' ? elapsed : 0,
    walkLeft: d.phase === 'walk' ? Math.max(0, d.walkSec - elapsed) : 0,
    halfwayDue: d.phase === 'run' && !d.cued && d.pace > 0 && elapsed >= d.pace * d.cueAt,
  };
}

export function lapSummary(laps, pace) {
  if (!laps.length) return null;
  const avg = Math.round((laps.reduce((a, b) => a + b, 0) / laps.length) * 10) / 10;
  return { avg, best: Math.min(...laps), worst: Math.max(...laps), diffs: laps.map((l) => (pace ? Math.round((l - pace) * 10) / 10 : null)) };
}
