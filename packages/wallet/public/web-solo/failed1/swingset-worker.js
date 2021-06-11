/* global self MessageChannel */

let count = 0;
let storePort;
const channel = new MessageChannel();
const clients = [];

const broadcast = obj => {
  let i = 0;
  while (i < clients.length) {
    try {
      clients[i].postMessage(obj);
      i += 1;
    } catch (e) {
      clients.splice(i, 1);
    }
  }
};

const trapToStore = obj => {
  // FIXME: Make a trap to the store.
  storePort.postMessage(['dapp request', ...obj]);
  const t0 = Date.now();
  while (Date.now() - t0 < 2000);
  return `trap ${obj[0]}`;
};

// eslint-disable-next-line no-restricted-globals
self.addEventListener('connect', bootEv => {
  const parentPort = bootEv.ports[0];

  clients.push(parentPort);
  parentPort.start();
  parentPort.addEventListener('message', ev => {
    console.log('swingset got', ...ev.data);

    switch (ev.data[0]) {
      case 'sendSharedArrayBuffer': {
        console.log('sab = ', ev.data[1]);
        break;
      }
      case 'initStore': {
        parentPort.postMessage(['count', count]);
        if (storePort) {
          return;
        }
        storePort = channel.port1;
        storePort.addEventListener('message', sev => {
          parentPort.postMessage(['fromstoreviass', ...sev.data]);
        });
        storePort.start();
        parentPort.postMessage(['fromss', 'to parent']);
        ev.data[1].postMessage(['initSS', channel.port2], [channel.port2]);
        break;
      }
      case 'getCount': {
        count += 1;
        broadcast(['count', count]);
        storePort.postMessage(['fromss', 'to store']);
        break;
      }
      case 'fromDapp': {
        count += 1;
        broadcast(['count', count]);
        const results = trapToStore([...ev.data.slice(1)]);
        parentPort.postMessage(['toDapp', results]);
        count += 1;
        broadcast(['count', count]);
        break;
      }
      default: {
        console.log('unrecognized message');
      }
    }
  });
});
