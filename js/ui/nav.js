// 화면 전환
let renderFn = () => {};
export const setRender = (f) => { renderFn = f; };
export const rerender = () => renderFn();
export function go(hash) {
  if (location.hash === hash) rerender();
  else location.hash = hash;
}
