/* global process setTimeout */
// eslint-disable-next-line import/order
import { replaceGlobalMeter } from './install-metering';
import '@agoric/install-ses'; // calls lockdown()

import test from 'ava';
import * as babelCore from '@babel/core';

import { makeMeter, makeMeteredEvaluator } from '../src/index';

// 'May be blocked by https://github.com/Agoric/SES-beta/issues/8',

// Our SES evaluator uses a Compartment.
const makeEvaluator = opts => {
  const c = new Compartment(undefined, undefined, opts);
  return {
    evaluate(src, endowments = {}) {
      return c.evaluate(src, { endowments });
    },
  };
};

test.skip('metering evaluator', async t => {
  const rejectionHandler = (_e, _promise) => {
    // console.log('have', e);
  };
  try {
    process.on('unhandledRejection', rejectionHandler);
    const { meter, refillFacet } = makeMeter();

    const refillers = new Map();
    refillers.set(meter, () => Object.values(refillFacet).forEach(r => r()));

    const meteredEval = makeMeteredEvaluator({
      replaceGlobalMeter,
      refillMeterInNewTurn: m => {
        const refiller = refillers.get(m);
        if (refiller) {
          // NOTE: Can check m.isExhausted() to see if the meter
          // is exhausted and decide whether or not to refill based
          // on that.
          refiller();
        }
      },
      babelCore,
      makeEvaluator,
      quiesceCallback: cb => setTimeout(cb),
    });

    // Destructure the output of the meteredEval.
    let exhaustedTimes = 0;
    let expectedExhaustedTimes = 0;
    const myEval = (m, src, endowments = {}) => {
      // Refill the meter as we're just starting the turn.
      return meteredEval(m, src, endowments).then(evalReturn => {
        const [normalReturn, value, metersSeen] = evalReturn;
        t.deepEqual(metersSeen, [meter], 'my meter was the only one seen');
        const e = meter.isExhausted();
        if (e) {
          exhaustedTimes += 1;
          throw e;
        }
        if (!normalReturn) {
          throw value;
        }
        return value;
      });
    };

    /*
    const fakeMeter = {
      isExhausted() { return false; },
      a(...args) { console.log('a', ...args) },
      c(...args) { console.log('c', ...args) },
      l(...args) { console.log('l', ...args) },
      e(...args) { console.log('e', ...args) },
    };
    */
    const src1 = `123; 456;`;
    t.is(await myEval(meter, src1), 456, 'trivial source succeeds');

    const src5a = `\
('x'.repeat(1e8), 0)
`;
    expectedExhaustedTimes += 1;
    await t.throwsAsync(
      myEval(meter, src5a),
      { message: /Allocate meter exceeded/ },
      'big string exhausts',
    );

    const src5 = `\
(new Array(1e9), 0)
`;
    expectedExhaustedTimes += 1;
    await t.throwsAsync(
      myEval(meter, src5),
      { message: /Allocate meter exceeded/ },
      'big array exhausts',
    );

    const src2 = `\
function f(a) {
  return f(a + 1) + f(a + 2);
}
f(1);
`;
    expectedExhaustedTimes += 1;
    await t.throwsAsync(
      myEval(meter, src2),
      { message: /Stack meter exceeded/ },
      'stack overflow exhausts',
    );

    const src3 = `\
while (true) {}
`;
    expectedExhaustedTimes += 1;
    await t.throwsAsync(
      myEval(meter, src3),
      { message: /Compute meter exceeded/ },
      'infinite loop exhausts',
    );

    const src3b = `\
(() => { while(true) {} })();
`;
    expectedExhaustedTimes += 1;
    await t.throwsAsync(
      myEval(meter, src3b),
      { message: /Compute meter exceeded/ },
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
    await t.throwsAsync(
      myEval(meter, src3a),
      { message: /Compute meter exceeded/ },
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
    await t.throwsAsync(
      myEval(meter, src3c),
      { message: / meter exceeded/ },
      'promise loop exhausts',
    );

    const src4 = `\
/(x+x+)+y/.test('x'.repeat(10000));
`;
    t.is(
      await myEval(meter, src4),
      false,
      `catastrophic backtracking doesn't happen`,
    );

    const src6 = `\
new Array(1e8).map(Object.create); 0
`;
    expectedExhaustedTimes += 1;
    await t.throwsAsync(
      myEval(meter, src6),
      { message: /Allocate meter exceeded/ },
      'long map exhausts',
    );

    t.is(
      exhaustedTimes,
      expectedExhaustedTimes,
      `meter was exhausted ${expectedExhaustedTimes} times`,
    );
  } finally {
    process.off('unhandledRejection', rejectionHandler);
  }
});
