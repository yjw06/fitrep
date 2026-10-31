// 간단한 SVG 선 그래프(톱세트 무게)
const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs, ...kids) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  kids.forEach((k) => el.append(k));
  return el;
};

export function lineChart(points, { width = 340, height = 170, unit = 'kg' } = {}) {
  const pad = { l: 36, r: 10, t: 12, b: 24 };
  const svg = s('svg', { viewBox: `0 0 ${width} ${height}`, class: 'chart', role: 'img', 'aria-label': '톱세트 무게 그래프' });
  if (!points.length) return svg;
  const ys = points.map((p) => p.y);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (lo === hi) { lo -= 5; hi += 5; }
  const span = hi - lo;
  lo = Math.max(0, lo - span * 0.1); hi += span * 0.1;
  const W = width - pad.l - pad.r, H = height - pad.t - pad.b;
  const x = (i) => pad.l + (points.length === 1 ? W / 2 : (i / (points.length - 1)) * W);
  const y = (v) => pad.t + H - ((v - lo) / (hi - lo)) * H;
  for (let k = 0; k <= 3; k++) {
    const v = lo + ((hi - lo) * k) / 3;
    svg.append(s('line', { x1: pad.l, x2: width - pad.r, y1: y(v), y2: y(v), class: 'grid' }));
    svg.append(s('text', { x: pad.l - 4, y: y(v) + 4, 'text-anchor': 'end' }, String(Math.round(v * 10) / 10)));
  }
  svg.append(s('polyline', { class: 'ln', points: points.map((p, i) => `${x(i)},${y(p.y)}`).join(' ') }));
  points.forEach((p, i) => svg.append(s('circle', { class: 'pt', cx: x(i), cy: y(p.y), r: 3.5 })));
  const lab = (i) => svg.append(s('text', { x: x(i), y: height - 6, 'text-anchor': points.length === 1 ? 'middle' : i === 0 ? 'start' : 'end' }, points[i].label));
  lab(0);
  if (points.length > 1) lab(points.length - 1);
  svg.append(s('text', { x: 4, y: 10 }, unit));
  return svg;
}
