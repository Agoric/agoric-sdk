import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';

export function buildRootObject() {
  const callbackObj = harden({
    callback(_arg1, _arg2) {
      // console.log(`callback`, arg1, arg2);
      return ['data', callbackObj]; // four, resolves pF
    },
  });

  const precD = makePromiseKit();
  const precE = makePromiseKit();

  function checkResB(resB) {
    if (resB === callbackObj) {
      return 'B good';
    }
    return `B bad: ${resB}`;
  }

  function checkResC(resC) {
    return `C bad: not error, got ${resC}`;
  }

  function checkErrC(errC) {
    if (errC.message === 'oops') {
      return 'C good';
    }
    return `C wrong error ${errC.message}`;
  }

  function checkResF([resF1, resF2]) {
    if (resF1 !== 'data') {
      return 'F bad: data';
    }
    if (resF2 !== callbackObj) {
      return `F bad: callbackObj was ${callbackObj}`;
    }
    return 'F good';
  }

  function checkA([pB, pC, pF]) {
    return Promise.all([
      pB.then(checkResB),
      pC.then(checkResC, checkErrC),
      pF.then(checkResF),
    ]);
  }

  return harden({
    bootstrap(vats) {
      const pA = E(vats.target).zero(callbackObj, precD.promise, precE.promise);
      const rp3 = E(vats.target).one();
      precD.resolve(callbackObj); // two
      precE.reject(Error('four')); // three
      const done = Promise.all([pA.then(checkA), rp3]);
      return done; // expect: [['B good', 'C good', 'F good'], 'rp3 good']
    },
  });
}
