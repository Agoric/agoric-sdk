/* global WeakRef, FinalizationRegistry */
import '@endo/init/debug.js';
import test from 'ava';
import { waitUntilQuiescent } from './waitUntilQuiescent.js';
import { makeGcAndFinalize } from './gc-and-finalize.js';
import { makeDummyMeterControl } from './dummyMeterControl.js';
import engineGC from './engine-gc.js';

import { setupTestLiveslots } from './liveslots-helpers.js';
import { makeDispatch, buildSyscall } from './liveslots-helpers.js';
import { makeLiveSlots } from '../src/liveslots.js';
import { kser } from './kmarshal.js';
import { Far } from '@endo/far';

function buildRootObject(vatPowers) {
  const initData = () => ({});
  const behavior = {};
  const { VatData } = vatPowers;
  const { makeKindHandle, defineDurableKind } = VatData;
  const kh = makeKindHandle('root');
  const makeRoot = defineDurableKind(kh, initData, behavior);
  const root = makeRoot();
  //return Far('root', {});
  return root;
}

test('forbid durable root object', async t => {
  // setupTestLiveslots does startVat internally, which is where the
  // durable-root prohibition is triggered
  //
  // the "happy path" would be this:
  //
  //const p = setupTestLiveslots(t, buildRootObject, 'bob');
  //
  // but we expect (insist) that it fails, with this:
  //
  //await t.throwsAsync(() => setupTestLiveslots(t, buildRootObject, 'bob'),
  //              { message: /must return ephemeral/ });

  // the rest of this is a long-form execution of what
  // setupTestLiveslots does internally, in the hopes of getting more
  // control over the portion that triggers the unhandled rejection

  const { syscall } = buildSyscall();
  const gcTools = harden({
    WeakRef,
    FinalizationRegistry,
    waitUntilQuiescent,
    gcAndFinalize: makeGcAndFinalize(engineGC),
    meterControl: makeDummyMeterControl(),
  });
  const { dispatch, testHooks } = makeLiveSlots(
    syscall,
    'v1',
    {},
    {},
    gcTools,
    undefined,
    () => ({ buildRootObject }),
  );

  // the "happy path" would be:
  //
  //const p = dispatch(['startVat', kser()]);

  // we exercise the erroring path:

  await t.throwsAsync(() => dispatch(['startVat', kser()]),
                      { message: /must return ephemeral/ });
});
