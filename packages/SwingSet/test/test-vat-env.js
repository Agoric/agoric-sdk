import { test } from '../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { Far } from '@endo/marshal';

test('harden from SES is in the vat environment', t => {
  harden();
  t.pass();
});

function makeThingInstance(_state) {
  return {
    self: Far('thing', {
      ping() {
        return 4;
      },
    }),
  };
}

test('makeKind is in the vat environment', t => {
  // TODO: configure eslint to know that makeKind is a global
  // eslint-disable-next-line no-undef
  const thingMaker = makeKind(makeThingInstance);
  const thing1 = thingMaker('thing-1');
  t.is(thing1.ping(), 4);
});

test('makeVirtualScalarWeakMap is in the vat environment', t => {
  // TODO: configure eslint to know that makeVirtualScalarWeakMap is a global
  // eslint-disable-next-line no-undef
  const s1 = makeVirtualScalarWeakMap();
  const k1 = { role: 'key' };
  const o1 = { size: 10, color: 'blue' };
  s1.init(k1, o1);
  t.is(s1.get(k1), o1);
});
