/* global globalThis */
/* eslint-disable no-await-in-loop */
import test from 'tape-promise/tape';

import { makeMeterAndResetters, makeMeteringEndowments } from '../src/index';

test('meter running', async t => {
  try {
    const [meter, resetters] = makeMeterAndResetters({ maxCombined: 10 });
    const e = makeMeteringEndowments(meter, globalThis);
    t.throws(() => new e.Array(10), RangeError, 'new Array exhausted');

    resetters.combined(20);
    const a = new e.Array(10);
    t.throws(
      () => a.map(e.Object.create),
      RangeError,
      'map to Object create exhausted',
    );

    resetters.combined(50);
    const fthis = {};
    // eslint-disable-next-line no-new-func
    const f = Function('return this');
    const fb = e.Function.prototype.bind.call(f, fthis);
    t.equals(fb(), fthis, 'function is bound');
    t.throws(
      () => {
        for (let i = 0; i < 10; i += 1) {
          fb();
        }
      },
      RangeError,
      'bound function exhausted',
    );
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
