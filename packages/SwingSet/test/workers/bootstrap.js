import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';
import { Far } from '@endo/marshal';

export const buildRootObject = () => {
  const callbackObj = Far('callback', {
    callback: (_arg1, _arg2) => ['data', callbackObj],
  });

  const precD = makePromiseKit();
  const precE = makePromiseKit();

  const dropMe = Far('dropMe', {});

  const checkResB = resB => {
    if (resB === callbackObj) {
      return 'B good';
    }
    return `B bad: ${resB}`;
  };

  const checkResC = resC => `C bad: not error, got ${resC}`;

  const checkErrC = errC => {
    if (errC.message === 'oops') {
      return 'C good';
    }
    return `C wrong error ${errC.message}`;
  };

  const checkResF = ([resF1, resF2]) => {
    if (resF1 !== 'data') {
      return 'F bad: data';
    }
    if (resF2 !== callbackObj) {
      return `F bad: callbackObj was ${callbackObj}`;
    }
    return 'F good';
  };

  const checkThree = three =>
    three === 3 ? 'three good' : `not three, got ${three}`;

  const checkA = ([pB, pC, pF, three, vs1, vs2, evt, evwft]) =>
    Promise.all([
      pB.then(checkResB),
      pC.then(checkResC, checkErrC),
      pF.then(checkResF),
      checkThree(three),
      vs1 === 'vsValue' ? 'vs1 good' : 'vs1 bad',
      vs2 === undefined ? 'vs2 good' : 'vs2 bad',
      evt === 'function' ? 'exit good' : 'exit bad',
      evwft === 'function' ? 'exitWF good' : 'exitWF bad',
    ]);

  return Far('root', {
    bootstrap: (vats, devices) => {
      const pA = E(vats.target).zero(
        callbackObj,
        precD.promise,
        precE.promise,
        devices.add,
        dropMe,
      );
      const rp3 = E(vats.target).one();
      precD.resolve(callbackObj); // two
      precE.reject(Error('four')); // three
      const done = Promise.all([pA.then(checkA), rp3]);
      // expect: [['B good', 'C good', 'F good', 'three good', 'vs1 good', 'vs2 good', 'exit good', 'exitWF good'], 'rp3 good']
      return done;
    },
  });
};
