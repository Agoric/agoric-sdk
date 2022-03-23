import { test, VatData } from '../tools/prepare-test-env-ava.js';

import { provideHostStorage } from '../src/controller/hostStorage.js';
import { buildVatController } from '../src/index.js';

test('harden from SES is in the test environment', t => {
  harden();
  t.pass();
});

const actualizeThing = _state => ({
  ping: () => 4,
});

test('kind makers are in the test environment', t => {
  const makeVThing = VatData.defineKind('thing', null, actualizeThing);
  const vthing = makeVThing('vthing');
  t.is(vthing.ping(), 4);

  const kind = VatData.makeKindHandle('thing');
  const makeDThing = VatData.defineDurableKind(kind, null, actualizeThing);
  const dthing = makeDThing('dthing');
  t.is(dthing.ping(), 4);
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
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: new URL('vat-envtest.js', import.meta.url).pathname,
      },
    },
    defaultManagerType: workerType,
  };
  const hostStorage = provideHostStorage();
  const c = await buildVatController(config, [], {
    hostStorage,
  });
  await c.run();
  t.deepEqual(c.dump().log, [
    'control sample: undefined',
    'harden: function',
    'VatData: object',
    'VatData.defineKind: function',
    'VatData.defineDurableKind: function',
    'VatData.makeKindHandle: function',
    'VatData.makeScalarBigMapStore: function',
    'VatData.makeScalarBigWeakMapStore: function',
    'VatData.makeScalarBigSetStore: function',
    'VatData.makeScalarBigWeakSetStore: function',
  ]);
}

test('expected globals are in the local worker vat environment', async t => {
  await testForExpectedGlobals(t, 'local');
});

test('expected globals are in the XS worker vat environment', async t => {
  await testForExpectedGlobals(t, 'xs-worker');
});

test.skip('expected globals are in the node worker vat environment', async t => {
  await testForExpectedGlobals(t, 'nodeWorker');
});

test.skip('expected globals are in the node sub-process worker vat environment', async t => {
  await testForExpectedGlobals(t, 'node-subprocess');
});
