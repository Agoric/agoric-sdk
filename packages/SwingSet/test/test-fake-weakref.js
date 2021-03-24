import { test } from '../tools/prepare-test-env-ava';

import { WeakRef, FinalizationRegistry } from '../src/weakref';

// We don't test that WeakRefs actually work, we only make sure we can
// interact with them without crashing. This exercises the fake no-op WeakRef
// and FinalizationRegistry that our `src/weakref.js` creates on Node.js v12.
// On v14 we get real constructors.

test('weakref is callable', async t => {
  const obj = {};
  const wr = new WeakRef(obj);
  t.is(obj, wr.deref());

  const callback = () => 0;
  const fr = new FinalizationRegistry(callback);
  fr.register(obj);

  const obj2 = {};
  const handle = {};
  fr.register(obj2, handle);
  fr.unregister(handle);
});
