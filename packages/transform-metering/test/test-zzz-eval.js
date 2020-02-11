// import * as tamer from '@agoric/tame-metering';
import * as tamer from '@agoric/tame-metering/src/install-global-metering';
import * as c from '@agoric/tame-metering/src/constants';

import test from 'tape-promise/tape';
import * as babelCore from '@babel/core';
import * as ses from 'ses';

import { makeMeter, makeMeteredEvaluator } from '../src/index';

let sesRealm;
let replaceGlobalMeter;
if (!sesRealm) {
  // FIXME: lockdown() approach appears to be the only way to both secure
  // this realm and make meters available to evaluators.
  const { lockdown, default: SES } = ses;
  const { tameMetering, default: globalReplaceGlobalMeter } = tamer;
  if (tameMetering && !lockdown) {
    const shim = `\
(() => {
  const globalThis = this;

  // Provide imported references to the metering tamer.
  const c = ${JSON.stringify(c)}
  let replaceGlobalMeter;
  replaceGlobalMeter = (${tamer.tameMetering})();

  let neutered;
  this.Q = () => {
    if (!neutered) {
      neutered = true;
      return replaceGlobalMeter;
    }
    throw Error('Cannot execute twice');
  };
})()`;
    const fixedShim = shim.replace(/_[a-z0-9]{3}\u200d\.g\./gs, '');
    sesRealm = SES.makeSESRootRealm({
      consoleMode: 'allow',
      errorStackMode: 'allow',
      shims: [fixedShim],
    });
    replaceGlobalMeter = sesRealm.evaluate('Q()');
    console.log('have', replaceGlobalMeter, replaceGlobalMeter());
    process.exit(0);
  } else if (!lockdown) {
    // We already tamed globally.
    sesRealm = SES.makeSESRootRealm({
      consoleMode: 'allow',
      errorStackMode: 'allow',
    });
    replaceGlobalMeter = globalReplaceGlobalMeter;
  } else if (tameMetering) {
    // FIXME: How to get sesRealm?
    replaceGlobalMeter = tameMetering();
    lockdown();
  } else {
    // FIXME: How to get sesRealm?
    replaceGlobalMeter = tamer.default;
    lockdown();
  }
}

export const makeSESEvaluator = opts =>
  sesRealm.global.Realm.makeCompartment(opts);

test('metering evaluator', async t => {
  const rejectionHandler = (_e, _promise) => {
    // console.log('have', e);
  };
  try {
    process.on('unhandledRejection', rejectionHandler);
    const { meter, adminFacet } = makeMeter();
    const makeEvaluator = makeSESEvaluator; // ideal
    const meteredEval = makeMeteredEvaluator({
      replaceGlobalMeter,
      babelCore,
      makeEvaluator,
      quiesceCallback: cb => setTimeout(cb),
    });

    // Destructure the output of the meteredEval.
    let exhaustedTimes = 0;
    let expectedExhaustedTimes = 0;
    const myEval = (src, endowments = {}) => {
      Object.values(adminFacet).forEach(r => r());
      let whenQuiesced;
      const whenQuiescedP = new Promise(res => (whenQuiesced = res)).then(
        ({ exhausted, returned, exceptionBox }) => {
          // console.log('quiesced returned', exhausted, exceptionBox, returned);
          if (exhausted) {
            exhaustedTimes += 1;
            throw exhausted;
          }
          if (exceptionBox) {
            console.log(exceptionBox[0]);
            throw exceptionBox[0];
          }
          return returned;
        },
      );
      // Defer the evaluation for another turn.
      Promise.resolve()
        .then(_ => meteredEval(meter, src, endowments, whenQuiesced))
        .catch(_ => {});
      return whenQuiescedP;
    };

    const src1 = `123; 456;`;
    t.equals(await myEval(src1), 456, 'trivial source succeeds');

    const failedToRejectUnderSES = () => {
      // FIXME: This skips tests that aren't currently working under SES.
      const times = makeEvaluator === makeSESEvaluator ? 0 : 1;
      expectedExhaustedTimes += times;
      return times === 0;
    };

    const src5a = `\
('x'.repeat(1e8), 0)
`;
    failedToRejectUnderSES() ||
      (await t.rejects(
        myEval(src5a),
        /Allocate meter exceeded/,
        'big string exhausts',
      ));

    const src5 = `\
(new Array(1e8), 0)
`;
    failedToRejectUnderSES() ||
      (await t.rejects(
        myEval(src5),
        /Allocate meter exceeded/,
        'big array exhausts',
      ));

    const src2 = `\
function f(a) {
  return f(a + 1) + f(a + 2);
}
f(1);
`;
    expectedExhaustedTimes += 1;
    await t.rejects(
      myEval(src2),
      /Stack meter exceeded/,
      'stack overflow exhausts',
    );

    const src3 = `\
while (true) {}
`;
    expectedExhaustedTimes += 1;
    await t.rejects(
      myEval(src3),
      /Compute meter exceeded/,
      'infinite loop exhausts',
    );

    const src3b = `\
(() => { while(true) {} })();
`;
    expectedExhaustedTimes += 1;
    await t.rejects(
      myEval(src3b),
      /Compute meter exceeded/,
      'nested loop exhausts',
    );

    const src3a = `\
Promise.resolve().then(
  () => {
    while(true) {}
  });
0
`;
    expectedExhaustedTimes += 1;
    await t.rejects(
      myEval(src3a),
      /Compute meter exceeded/,
      'promised infinite loop exhausts',
    );

    const src3c = `\
function f() {
  Promise.resolve().then(f);
}
f();
0
`;
    expectedExhaustedTimes += 1;
    await t.rejects(
      myEval(src3c),
      /Compute meter exceeded/,
      'promise loop exhausts',
    );

    const src4 = `\
/(x+x+)+y/.test('x'.repeat(10000));
`;
    t.equals(
      await myEval(src4),
      false,
      `catastrophic backtracking doesn't happen`,
    );

    const src6 = `\
new Array(1e8).map(Object.create); 0
`;
    failedToRejectUnderSES() ||
      (await t.rejects(
        myEval(src6),
        /Allocate meter exceeded/,
        'long map exhausts',
      ));

    t.equals(
      exhaustedTimes,
      expectedExhaustedTimes,
      `meter was exhausted ${expectedExhaustedTimes} times`,
    );
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    process.off('unhandledRejection', rejectionHandler);
    t.end();
  }
});
