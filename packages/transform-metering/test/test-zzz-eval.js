// eslint-disable-next-line import/order
import setGlobalMeter from '@agoric/tame-metering/src/install-global-metering';

/* eslint-disable no-await-in-loop */
import test from 'tape-promise/tape';
import * as babelCore from '@babel/core';
import SES from 'ses';

import { makeMeteredEvaluator } from '../src/index';

test('metering evaluator', async t => {
  try {
    const meteredEval = makeMeteredEvaluator({
      setGlobalMeter,
      babelCore,
      makeEvaluator: SES.makeSESRootRealm,
    });

    // Destructure the output of the meteredEval.
    let exhaustedTimes = 0;
    const myEval = src => {
      const { exhausted, exceptionBox, returned } = meteredEval(src);
      if (exhausted) {
        exhaustedTimes += 1;
      }
      if (exceptionBox) {
        throw exceptionBox[0];
      }
      return returned;
    };

    const src1 = `123; 456;`;
    t.equals(myEval(src1), 456, 'trivial source succeeds');

    const src2 = `\
function f() {
  f();
  return 1;
}
f();
`;
    t.throws(
      () => myEval(src2),
      /Stack meter exceeded/,
      'stack overflow fails',
    );

    const src3 = `\
while (true) {}
`;
    t.throws(
      () => myEval(src3),
      /Compute meter exceeded/,
      'infinite loop fails',
    );

    const src4 = `\
/(x+x+)+y/.test('x'.repeat(10000));
`;
    t.equals(myEval(src4), false, `catastrophic backtracking doesn't happen`);

    const src5 = `\
new Array(1e6).map(Object.create)
`;
    t.throws(() => myEval(src5), /Allocate meter exceeded/, 'long map fails');

    t.equals(exhaustedTimes, 3, `meter was exhausted as expected`);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
