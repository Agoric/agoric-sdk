/* global globalThis */
/* eslint-disable no-await-in-loop */
import test from 'tape-promise/tape';
import * as babelCore from '@babel/core';
import SES from 'ses';

import {
  makeMeterAndResetters,
  makeMeteringEndowments,
  makeMeteringTransformer,
} from '../src/index';

test('metering end-to-end', async t => {
  try {
    const [meter, reset] = makeMeterAndResetters();
    const { meterId, meteringTransform } = makeMeteringTransformer(babelCore);
    const endowments = makeMeteringEndowments(meter, globalThis, {}, meterId);
    const transforms = [meteringTransform];

    const s = SES.makeSESRootRealm({ transforms });

    const myEval = src => {
      Object.values(reset).forEach(r => r());
      return s.evaluate(src, endowments);
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
    t.throws(() => myEval(src5), RangeError, 'long map fails');
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
