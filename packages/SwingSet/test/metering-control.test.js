import { test } from '../tools/prepare-test-env-ava.js';

import { makeDummyMeterControl } from '../src/kernel/dummyMeterControl.js';

test('dummy meter control', async t => {
  const mc = makeDummyMeterControl();
  t.false(mc.isMeteringDisabled());
  t.throws(mc.assertNotMetered);
  mc.runWithoutMetering(mc.assertNotMetered);
  let x = 0;
  mc.runWithoutMetering(() => (x = 1));
  t.is(x, 1);
  await mc.runWithoutMeteringAsync(() => (x = 2));
  t.is(x, 2);
  function set(y) {
    x = y;
    return 'yes';
  }
  const unmeteredSet = mc.unmetered(set);
  t.is(unmeteredSet(3), 'yes');
  t.is(x, 3);
});
