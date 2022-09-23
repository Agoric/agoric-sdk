export const onLoadP = new Promise(res =>
  window.addEventListener('load', () => res()),
);
