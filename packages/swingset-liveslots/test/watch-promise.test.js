import test from 'ava';

import { Far } from '@endo/marshal';
import { makePromiseKit } from '@endo/promise-kit';
import { setupTestLiveslots } from './liveslots-helpers.js';

const build = vatPowers => {
  const { VatData } = vatPowers;
  const { makeKindHandle, defineDurableKind, watchPromise } = VatData;

  const kh = makeKindHandle('handler');
  const init = () => ({});
  const behavior = {
    onFulfilled: _value => 0,
    onRejected: _reason => 0,
  };
  const makeHandler = defineDurableKind(kh, init, behavior);

  return Far('root', {
    async run() {
      const pr = makePromiseKit();
      const handler = makeHandler();
      watchPromise(pr.promise, handler);
      pr.resolve('ignored');
    },
  });
};

test('watched local promises should not leak slotToVal entries', async t => {
  const { dispatchMessage, testHooks } = await setupTestLiveslots(
    t,
    build,
    'vatA',
  );
  const { slotToVal } = testHooks;
  const initial = slotToVal.size;

  await dispatchMessage('run');
  t.is(slotToVal.size, initial);
  await dispatchMessage('run');
  t.is(slotToVal.size, initial);
});
