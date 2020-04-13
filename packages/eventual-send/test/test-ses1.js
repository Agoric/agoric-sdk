/* global HandledPromise */
import test from 'tape-promise/tape';
import SES1HandledPromiseShim from '../src/ses1';

test('Shim can execute', async t => {
  try {
    // eslint-disable-next-line no-eval
    (1, eval)(SES1HandledPromiseShim);
    t.assert(HandledPromise, `HandledPromise is now defined`);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
