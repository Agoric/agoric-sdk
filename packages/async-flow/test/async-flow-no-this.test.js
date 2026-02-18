// eslint-disable-next-line import/order
import { test, getBaggage, annihilate } from './prepare-test-env-ava.js';

import { passStyleOf } from '@endo/pass-style';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { prepareVowTools } from '@agoric/vow';
import { makeHeapZone } from '@agoric/zone/heap.js';
import { makeVirtualZone } from '@agoric/zone/virtual.js';
import { makeDurableZone } from '@agoric/zone/durable.js';

import { prepareTestAsyncFlowTools } from './_utils.js';

/**
 * @import {Zone} from '@agoric/base-zone';
 */

const { apply } = Reflect;

/**
 * @param {any} t
 * @param {Zone} zone
 */
const testPlay = async (t, zone) => {
  const vowTools = prepareVowTools(zone);
  const { asyncFlow } = prepareTestAsyncFlowTools(t, zone, {
    vowTools,
  });

  const { guestFunc } = {
    async guestFunc() {
      // @ts-expect-error TS doesn't yet know about guest context objects,
      const { flowInspector, self, state, facets } = this;
      t.is(self, undefined);
      t.is(state, undefined);
      t.is(facets, undefined);
      t.is(passStyleOf(flowInspector), 'remotable');
    },
  };

  const wrapperFunc = asyncFlow(zone, 'guestFunc', guestFunc);

  await wrapperFunc();
  // Demonstrates that even if something is passed as `this` to the wrapperFunc,
  // the wrapperFunc with throw an error that this feature is not yet
  // supported. This is in order to reserve the use of the this-binding of
  // the guest function and the wrapperFunc as async menthods of host exos.
  // In that case, `wrapperFunc` will be called with a this-binding of
  // `{ state, self }` or `{ state, facets }`. The guest will be invoked with
  // a guest analog of the context object, but with an additional `flowInspector`
  // propoerty. To prepare for that, the wrapper must be called with a
  // this-binding of `undefined`, in which case the guest function is called
  // with a this-binding of `{ flowInspector }`.
  t.throws(() => apply(wrapperFunc, 'bogus', []), {
    message: 'asyncFlow this-binding not yet supported',
  });
};

test.serial('test heap no guest this', async t => {
  annihilate();
  const zone = makeHeapZone('heapRoot');
  await testPlay(t, zone);

  await eventLoopIteration();
});

test.serial('test virtual no guest this', async t => {
  annihilate();
  const zone = makeVirtualZone('virtualRoot');
  await testPlay(t, zone);

  await eventLoopIteration();
});

test.serial('test durable no guest this', async t => {
  annihilate();
  const zone = makeDurableZone(getBaggage(), 'durableRoot');
  await testPlay(t, zone);

  await eventLoopIteration();
});
