// @ts-check
export const onLoadP = /** @type {Promise<void>} */(new Promise(res => {
  if (document.readyState === 'complete') {
    res();
  } else {
    window.addEventListener('load', () => res());
  }
}));
