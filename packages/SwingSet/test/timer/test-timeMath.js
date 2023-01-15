import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { Far } from '@endo/far';
import { TimeMath } from '../../src/vats/timer/timeMath.js';

// TODO Although TimeMath is altogether rather simple, to test it well
// requires testing an explosion of combinations. It is an ideal case
// for property-based testing, so we should eventually do that.

test('timeMath same label', t => {
  const timerBrand = Far('fake timer brand', {});
  const t100 = harden({ timerBrand, absValue: 100n });
  const r3 = harden({ timerBrand, relValue: 3n });
  const t103 = harden({ timerBrand, absValue: 103n });
  t.deepEqual(TimeMath.addAbsRel(t100, r3), t103);
});

test('timeMath different labels', t => {
  const b1 = Far('fake timer brand 1', {});
  const b2 = Far('fake timer brand 2', {});
  const t100 = harden({ timerBrand: b1, absValue: 100n });
  const r3 = harden({ timerBrand: b2, relValue: 3n });
  t.throws(() => TimeMath.addAbsRel(t100, r3), {
    message: /TimerBrands must match: .* vs .*/,
  });
});

test('timeMath one label', t => {
  const timerBrand = Far('fake timer brand', {});
  const t100 = harden({ timerBrand, absValue: 100n });
  const r3 = harden({ timerBrand, relValue: 3n });
  const t103 = harden({ timerBrand, absValue: 103n });
  t.deepEqual(TimeMath.addAbsRel(t100, 3n), t103);
  t.deepEqual(TimeMath.addAbsRel(100n, r3), t103);
});

test('timeMath no labels', t => {
  t.deepEqual(TimeMath.addAbsRel(100n, 3n), 103n);
});
