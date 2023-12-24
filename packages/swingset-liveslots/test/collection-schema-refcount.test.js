import test from 'ava';

import { Far } from '@endo/marshal';
import { kser } from '@agoric/kmarshal';
import { makeLiveSlots } from '../src/liveslots.js';
import { parseVatSlot } from '../src/parseVatSlots.js';
import { buildSyscall } from './liveslots-helpers.js';
import { makeStartVat, makeBringOutYourDead } from './util.js';
import { makeMockGC } from './mock-gc.js';

// virtual/durable collections serialize their keyShape/valueShape,
// any Remotables therein must be compatible, and we should have
// refcounts on them

const shapetest = test.macro(async (t, collectionType, remotableType) => {
  const { syscall, fakestore } = buildSyscall();
  const gcTools = makeMockGC();
  let remotable;
  let map;

  function buildRootObject(vatPowers) {
    const { VatData } = vatPowers;
    const initData = () => ({});
    const handle = VatData.makeKindHandle('thing');
    const makeVirtualThing = VatData.defineKind('thing', initData, {});
    const makeDurableThing = VatData.defineDurableKind(handle, initData, {});
    switch (remotableType) {
      case 'ephemeral':
        remotable = Far('thing', {});
        break;
      case 'virtual':
        remotable = makeVirtualThing();
        break;
      case 'durable':
        remotable = makeDurableThing();
        break;
      default:
        throw Error(`unhandled ${remotableType}`);
    }
    t.truthy(remotable);
    const valueShape = remotable;
    const durable = collectionType === 'durable';
    map = VatData.makeScalarBigMapStore('map', { valueShape, durable });
    return Far('root', {});
  }

  const makeNS = () => ({ buildRootObject });
  const ls = makeLiveSlots(syscall, 'vatA', {}, {}, gcTools, undefined, makeNS);
  const { dispatch, testHooks } = ls;
  const startVat = makeStartVat(kser());
  if (collectionType === 'durable' && remotableType !== 'durable') {
    await t.throwsAsync(() => dispatch(startVat), {
      message: /value is not durable/,
    });
    // TODO: unhandled rejection interferes with the test
    return;
  }
  await dispatch(startVat);

  // the object we used in the valueShape schema ..
  const vref = testHooks.valToSlot.get(remotable);
  t.truthy(vref);

  // .. should appear in the serialized schema
  const mapVref = testHooks.valToSlot.get(map);
  const collectionID = parseVatSlot(mapVref).subid;
  const schemaKey = `vc.${collectionID}.|schemata`;
  const schemataData = JSON.parse(fakestore.get(schemaKey));
  t.deepEqual(schemataData.slots, [vref]);

  // and it should hold a refcount
  t.is(testHooks.getReachableRefCount(vref), 1);

  // now pretend the collection is deleted, and do a BOYD
  gcTools.kill(map);
  gcTools.flushAllFRs();
  await dispatch(makeBringOutYourDead());
  // the refcount should be gone
  t.falsy(testHooks.getReachableRefCount(vref));
  // so should the schema (and all other keys)
  t.falsy(fakestore.has(schemaKey));
});

test(
  'virtual collection shape holds ephmeral',
  shapetest,
  'virtual',
  'ephemeral',
);
test('virtual collection shape holds virtual', shapetest, 'virtual', 'virtual');
test('virtual collection shape holds durable', shapetest, 'virtual', 'durable');

test.skip(
  'durable collection shape holds ephmeral',
  shapetest,
  'durable',
  'ephemeral',
);
test.skip(
  'durable collection shape holds virtual',
  shapetest,
  'durable',
  'virtual',
);
test('durable collection shape holds durable', shapetest, 'durable', 'durable');
