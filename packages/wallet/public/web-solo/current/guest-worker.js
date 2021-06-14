/* eslint-disable no-restricted-globals */
/* global self */

console.log('guest-worker isolated:', self.isCrossOriginIsolated, self);

let tbuf;
self.addEventListener('message', ev => {
  const obj = ev.data;
  console.log('guest received', obj);
  if (obj && obj.type === 'WORKER_INIT') {
    const { transferBuffer } = obj;
    tbuf = new Int32Array(transferBuffer);
  }

  switch (obj && obj.type) {
    case 'WORKER_INIT':
    case 'WORKER_DELIVER': {
      const { msg } = obj;
      tbuf[0] = 0;
      const t0 = Date.now();
      console.log('worker waiting', msg, t0);
      self.postMessage({ type: 'TRAP', timeout: msg });
      Atomics.wait(tbuf, 0, 0);
      console.log('worker done waiting', Date.now() - t0);
      self.postMessage({ type: 'WORKER_READY' });
      break;
    }
    default:
  }
});
