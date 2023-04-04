import { test, simulateIncarnation } from '../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { provideDurableMapStore, prepareKind } from '@agoric/vat-data';

const initFoo = () => ({ count: 0 });
const fooBehavior = {
  increment: ({ state }) => {
    state.count += 1;
  },
  read: ({ state }) => state.count,
};

test('simulate upgrade', async t => {
  await simulateIncarnation(async baggage => {
    // first incarnation
    const s = provideDurableMapStore(baggage, 'store');
    const makeFoo = prepareKind(baggage, 'foo', initFoo, fooBehavior);

    s.init('key1', 'value1');

    const foo1 = makeFoo();
    s.init('foo1', foo1);
    foo1.increment();
    foo1.increment();
    t.is(foo1.read(), 2);
  });

  await simulateIncarnation(async baggage => {
    // second incarnation
    const s = provideDurableMapStore(baggage, 'store');
    const makeFoo = prepareKind(baggage, 'foo', initFoo, fooBehavior);

    t.is(s.get('key1'), 'value1');

    const foo1 = s.get('foo1');
    t.is(foo1.read(), 2);
    foo1.increment();
    t.is(foo1.read(), 3);
    t.is(makeFoo().read(), 0);
  });
});
