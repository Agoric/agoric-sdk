import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import {
  prepareMapStoreReadonlyView,
  prepareSetStoreReadonlyView,
} from '../src/prepare-store-readonly-view.js';
import {
  makeScalarBigMapStore,
  provideDurableMapStore,
  provideDurableSetStore,
} from '../src/vat-data-bindings.js';

test('prepare-store-readonly-view', t => {
  const baggage = makeScalarBigMapStore('Baggage');
  // These are "prepare" because, with real baggage,
  // they must occur in the first crank
  const makeMapStoreReadonlyView = prepareMapStoreReadonlyView(baggage);
  const makeSetStoreReadonlyView = prepareSetStoreReadonlyView(baggage);
  // Everything else could occur in later cranks.

  const m1 = provideDurableMapStore(baggage, 'm1');
  const m2 = provideDurableMapStore(baggage, 'm2');
  const s1 = provideDurableSetStore(baggage, 's1');

  const m1ro = makeMapStoreReadonlyView(m1);
  const s1ro = makeSetStoreReadonlyView(s1);

  const keyX = 'x';
  const valY = 'y';
  const valZ = 'z';

  t.false(m1.has(keyX));
  t.false(m1ro.has(keyX));
  t.false(s1.has(keyX));
  t.false(s1ro.has(keyX));

  t.throws(() => m1ro.init(keyX, valY), {
    message: 'm1ro.init is not a function',
  });
  t.throws(() => s1ro.add(keyX), {
    message: 's1ro.add is not a function',
  });

  m1.init(keyX, valY);
  m2.init(keyX, valZ);
  s1.add(keyX);

  t.is(m1.get(keyX), valY);
  t.is(m2.get(keyX), valZ);
  t.true(s1.has(keyX));

  t.is(m1ro.get(keyX), valY);
  t.true(s1ro.has(keyX));

  m1.set(keyX, valZ);
  t.is(m1ro.get(keyX), valZ);
  s1.delete(keyX);
  t.false(s1ro.has(keyX));
});
