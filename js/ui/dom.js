// 작은 DOM 헬퍼
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, kids);
  return el;
}

function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

export const $ = (sel, root = document) => root.querySelector(sel);

export function mount(root, ...kids) {
  root.replaceChildren();
  append(root, kids);
}

let toastTimer;
export function toast(msg, ms = 2200) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

const fmtNum = (v) => (v == null ? '—' : String(+(+v).toFixed(2)));

/**
 * ± 스테퍼. 값을 누르면 직접 입력(선택).
 * opts: { value, step, min, max, unit, label, onChange, fmt }
 */
export function stepper({ value, step = 1, min = 0, max = 9999, unit = '', label = '', onChange, fmt = fmtNum, testid }) {
  let v = value;
  const b = h('b', null, fmt(v));
  const set = (nv) => {
    nv = Math.min(max, Math.max(min, +(+nv).toFixed(3)));
    if (Number.isNaN(nv)) return;
    v = nv;
    b.textContent = fmt(v);
    onChange?.(v);
  };
  return h('div', { class: 'stepper', 'data-testid': testid },
    h('button', { type: 'button', 'aria-label': `${label} 감소`, onclick: () => set((v ?? 0) - step) }, '−'),
    h('div', {
      class: 'val', role: 'button', tabindex: 0,
      onclick: () => {
        const r = prompt(`${label} 입력${unit ? ` (${unit})` : ''}`, v ?? '');
        if (r != null && r.trim() !== '' && !Number.isNaN(+r)) set(+r);
      },
    }, b, h('small', null, [label, unit && ` ${unit}`])),
    h('button', { type: 'button', 'aria-label': `${label} 증가`, onclick: () => set((v ?? 0) + step) }, '+'),
  );
}

export function rirPicker(value, onChange, testid) {
  const btns = [0, 1, 2, 3, 4].map((n) => h('button', {
    type: 'button', class: value === n ? 'on' : '', 'aria-pressed': String(value === n),
    onclick: () => {
      const nv = value === n ? null : n;
      value = nv;
      btns.forEach((b, i) => { b.classList.toggle('on', i === nv); b.setAttribute('aria-pressed', String(i === nv)); });
      onChange(nv);
    },
  }, n));
  return h('div', { class: 'rir', 'data-testid': testid }, h('span', { class: 'lab' }, 'RIR'), btns);
}

export function confirmBox(msg) {
  return window.confirm(msg);
}

export const label = (text, extra = '') => h('div', { class: `label ${extra}` }, text);

export function stamp() {
  return h('div', { class: 'stamp', 'aria-label': '임무 완료' }, '임무 완료', h('span', { class: 'en' }, 'MISSION COMPLETE'));
}
