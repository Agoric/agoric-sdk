/* global self */
let ssPort;

console.log('have', self.indexedDB, self.WebSocket);

// eslint-disable-next-line no-restricted-globals
self.addEventListener('connect', connectEv => {
  const parentPort = connectEv.ports[0];
  parentPort.start();
  parentPort.addEventListener('message', ev => {
    console.log('store got', ...ev.data);
    switch (ev.data[0]) {
      case 'initSS': {
        if (ssPort) {
          return;
        }
        ssPort = ev.data[1];
        ssPort.addEventListener('message', sev => {
          ev.ports[0].postMessage(['fromstore', 'to ss', ...sev.data]);
        });
        ssPort.start();
        ssPort.postMessage(['fromstore', 'to ss init']);
        break;
      }
      default: {
        console.log('unrecognized store message');
      }
    }
  });
});
