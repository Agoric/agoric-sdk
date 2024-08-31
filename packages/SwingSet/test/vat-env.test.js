// @ts-nocheck
// eslint-disable-next-line import/order
import { test, VatData } from '../tools/prepare-test-env-ava.js';

import bundleSource from '@endo/bundle-source';
import { initSwingStore } from '@agoric/swing-store';
import { buildVatController } from '../src/index.js';

test('harden from SES is in the test environment', t => {
  harden();
  t.pass();
});

const thingBehavior = {
  ping: () => 4,
};

const multiThingBehavior = { thing: thingBehavior, other: thingBehavior };

test('kind makers are in the test environment', t => {
  const makeVThing = VatData.defineKind('thing', null, thingBehavior);
  const vthing = makeVThing('vthing');
  t.is(vthing.ping(), 4);

  const makeVMThing = VatData.defineKindMulti(
    'thing',
    null,
    multiThingBehavior,
  );
  const vmthing = makeVMThing('vthing');
  t.is(vmthing.thing.ping(), 4);

  const kind = VatData.makeKindHandle('thing');
  const makeDThing = VatData.defineDurableKind(kind, null, thingBehavior);
  const dthing = makeDThing('dthing');
  t.is(dthing.ping(), 4);

  const kind2 = VatData.makeKindHandle('thing2');
  const makeDMThing = VatData.defineDurableKindMulti(
    kind2,
    null,
    multiThingBehavior,
  );
  const dmthing = makeDMThing('dthing');
  t.is(dmthing.thing.ping(), 4);
});

test('store makers are in the test environment', t => {
  const o = harden({ size: 10, color: 'blue' });

  const m = VatData.makeScalarBigMapStore();
  m.init('key', o);
  t.deepEqual(m.get('key'), o);

  const wm = VatData.makeScalarBigWeakMapStore();
  wm.init('key', o);
  t.deepEqual(wm.get('key'), o);

  const s = VatData.makeScalarBigSetStore();
  s.add('key');
  t.truthy(s.has('key'));

  const ws = VatData.makeScalarBigWeakSetStore();
  ws.add('key');
  t.truthy(ws.has('key'));
});

async function testForExpectedGlobals(t, workerType) {
  /** @type {SwingSetConfig} */
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: new URL('vat-envtest.js', import.meta.url).pathname,
      },
    },
    defaultManagerType: workerType,
  };
  const bundle = await bundleSource(config.vats.bootstrap.sourceSpec);
  const kernelStorage = initSwingStore().kernelStorage;
  const c = await buildVatController(config, [bundle], {
    kernelStorage,
  });
  t.teardown(c.shutdown);
  await c.run();
  t.deepEqual(c.dump().log, [
    'control sample: undefined',
    'harden: function',
    'VatData: object',
    'VatData.defineKind: function',
    'VatData.defineKindMulti: function',
    'VatData.defineDurableKind: function',
    'VatData.defineDurableKindMulti: function',
    'VatData.makeKindHandle: function',
    'VatData.canBeDurable: function',
    'VatData.providePromiseWatcher: function',
    'VatData.watchPromise: function',
    'VatData.makeScalarBigMapStore: function',
    'VatData.makeScalarBigWeakMapStore: function',
    'VatData.makeScalarBigSetStore: function',
    'VatData.makeScalarBigWeakSetStore: function',
    'global has passStyleOf: true',
    'passStyleOf delegates to global: true',
    'child compartment has matching passStyleOf: true',
    'grandchild compartment has matching passStyleOf: true',
  ]);
}

test('expected globals are in the local worker vat environment', async t => {
  await testForExpectedGlobals(t, 'local');
});

test('expected globals are in the XS worker vat environment', async t => {
  await testForExpectedGlobals(t, 'xs-worker');
});
