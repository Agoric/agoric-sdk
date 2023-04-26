import { Far, E } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';

// this takes about 5.7M computrons
function consumeCPU() {
  const a = new Array(100);
  for (let i = 0; i < a.length; i += 1) {
    a[i] = i;
  }
  for (let i = 0; i < 200; i += 1) {
    a.sort((first, second) => first - second);
    a.sort((first, second) => second - first);
  }
}

export function buildRootObject(_vatPowers, _vatParameters, baggage) {
  baggage.init('counter', 0);
  baggage.init('seqnum', 0);
  let counter = 0;

  function increment() {
    counter += 1;
    baggage.set('counter', counter);
  }

  let nextPKR;
  function doPromise(args) {
    increment();
    args[0]
      .then(doPromise)
      .catch(err => console.log(`right doPromise err`, err));
    const oldPK = nextPKR;
    nextPKR = makePromiseKit();
    oldPK.resolve([nextPKR.promise]);
  }

  const right = Far('right', {
    doMessage(left, seqnum) {
      increment();
      if (seqnum !== 'disabled') {
        // if enbled, do extra work once every 5 cranks, to exercise the
        // limited-computron policy
        seqnum += 1;
        baggage.set('seqnum', seqnum);
        if (seqnum % 5 === 0) {
          consumeCPU();
        }
      }
      E(left).doMessage(right, seqnum);
    },

    startPromise(args) {
      nextPKR = makePromiseKit();
      args[0]
        .then(doPromise)
        .catch(err => console.log(`right startPromise err`, err));
      return harden([nextPKR.promise]);
    },
  });
  return right;
}
