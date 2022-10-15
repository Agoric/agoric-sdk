export const onLoadP = new Promise(res => {
  if (document.readyState === 'complete') {
    res();
  } else {
    window.addEventListener('load', () => res());
  }
});
